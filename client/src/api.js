export async function fetchToken({ clientId, clientSecret, environment }) {
  const res = await fetch("/api/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret, environment }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ? `${data.error} ${JSON.stringify(data.details || "")}` : "Token request failed.");
  }
  return data;
}

export async function callForwatt({ path, method = "GET", body, token, apiBaseUrl }) {
  if (!token) throw new Error("No access token available. Please request a token first.");

  const url = new URL(`/api/forwatt/${path}`, window.location.origin);

  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(apiBaseUrl ? { "x-api-base-url": apiBaseUrl } : {}),
    },
    body: method === "GET" || method === "HEAD" || body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}
