import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, test } from "node:test";

import { createApp } from "../../app.js";

let server: Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

test("GET /privacy returns public HTML without authentication", async () => {
  const response = await fetch(`${baseUrl}/privacy`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.redirected, false);
  assert.match(html, /Privacy Policy/);
  assert.match(html, /SME Feedback Aggregator/);
});

test("GET /terms returns public HTML without authentication", async () => {
  const response = await fetch(`${baseUrl}/terms`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.redirected, false);
  assert.match(html, /Terms of Service/);
});

test("GET /data-deletion returns public HTML without authentication", async () => {
  const response = await fetch(`${baseUrl}/data-deletion`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.redirected, false);
  assert.match(html, /Data Deletion/);
});
