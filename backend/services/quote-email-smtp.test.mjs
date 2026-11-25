// Verifies the Nodemailer/SMTP path end-to-end against a local SMTP sink.
// This proves the template is handed to a real SMTP transport with the correct
// recipient. It does NOT prove delivery to the external sales@ mailbox; that
// requires the production SMTP credentials and network access.

import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import { sendEmail } from "./notifications.mjs";
import { quoteInquiryEmail } from "./quote-inquiry.mjs";

function createSmtpSink() {
  const messages = [];
  const recipients = [];
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("220 localhost ESMTP Solarious test sink\r\n");

    let buffer = "";
    let dataMode = false;
    let data = "";
    let authStep = 0;

    socket.on("data", (chunk) => {
      buffer += chunk;
      let lineEnd = buffer.indexOf("\r\n");
      while (lineEnd >= 0) {
        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 2);

        if (dataMode) {
          if (line === ".") {
            dataMode = false;
            messages.push(data);
            data = "";
            socket.write("250 2.0.0 queued as test-message\r\n");
          } else {
            data += `${line}\r\n`;
          }
        } else if (authStep === 1) {
          authStep = 2;
          socket.write("334 UGFzc3dvcmQ6\r\n");
        } else if (authStep === 2) {
          authStep = 0;
          socket.write("235 2.7.0 Authentication successful\r\n");
        } else if (/^EHLO/i.test(line)) {
          socket.write("250-localhost\r\n");
          socket.write("250-AUTH PLAIN\r\n");
          socket.write("250-8BITMIME\r\n");
          socket.write("250-SMTPUTF8\r\n");
          socket.write("250 SIZE 10485760\r\n");
        } else if (/^HELO/i.test(line)) {
          socket.write("250 localhost\r\n");
        } else if (/^AUTH LOGIN/i.test(line)) {
          authStep = 1;
          socket.write("334 VXNlcm5hbWU6\r\n");
        } else if (/^AUTH PLAIN/i.test(line)) {
          socket.write("235 2.7.0 Authentication successful\r\n");
        } else if (/^MAIL FROM/i.test(line)) {
          socket.write("250 2.1.0 Sender accepted\r\n");
        } else if (/^RCPT TO:/i.test(line)) {
          const address = line.match(/<([^>]+)>/)?.[1] || "";
          if (address) recipients.push(address);
          socket.write("250 2.1.5 Recipient accepted\r\n");
        } else if (/^DATA/i.test(line)) {
          dataMode = true;
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (/^RSET/i.test(line)) {
          socket.write("250 2.0.0 Reset\r\n");
        } else if (/^QUIT/i.test(line)) {
          socket.write("221 2.0.0 Bye\r\n");
          socket.end();
        } else {
          socket.write("250 2.0.0 OK\r\n");
        }

        lineEnd = buffer.indexOf("\r\n");
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        port: server.address().port,
        messages,
        recipients,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

test("Nodemailer delivers the quote email to the configured sales recipient", async () => {
  const sink = await createSmtpSink();
  const saved = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    MAIL_FROM: process.env.MAIL_FROM,
    EMAIL_API_KEY: process.env.EMAIL_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };

  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(sink.port);
  process.env.SMTP_SECURE = "false";
  process.env.SMTP_USER = "smtp-test-user";
  process.env.SMTP_PASS = "smtp-test-password";
  process.env.SMTP_FROM = "";
  process.env.MAIL_FROM = "Solarious Energy <sales@solariousenergy.com>";
  delete process.env.EMAIL_API_KEY;
  delete process.env.EMAIL_FROM;

  try {
    const message = quoteInquiryEmail({
      inquiry: {
        _id: "smtp-test",
        kind: "quote",
        name: "Asha Patil",
        company: "Sunrise Solar",
        email: "asha@example.com",
        phone: "+919876543210",
        product: "Mono PERC 430 Wp",
        capacity: "430 Wp",
        location: "Nashik, Maharashtra",
        message: "Please quote 100 modules.",
        createdAt: new Date("2026-11-13T08:30:00.000Z"),
        details: { source: "product-page", quantity: 100 },
      },
      siteUrl: "https://solariousenergy.com",
    });

    const result = await sendEmail({
      to: ["sales@solariousenergy.com"],
      ...message,
      replyTo: "asha@example.com",
    });

    assert.equal(result.sent, true, JSON.stringify(result));
    assert.equal(result.provider, "smtp");
    assert.deepEqual(sink.recipients, ["sales@solariousenergy.com"]);
    assert.equal(sink.messages.length, 1);

    const raw = sink.messages[0];
    assert.match(raw, /^Subject:/m);
    assert.match(raw, /Asha Patil/);
    assert.match(raw, /Please quote 100 modules/);
    assert.match(raw, /Solarious Energy/);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await sink.close();
  }
});
