document.getElementById("sendBtn").addEventListener("click", async () => {
  const includeUA = document.getElementById("uaCheckbox").checked;
  const includeCookies = document.getElementById("cookiesCheckbox").checked;

  let cookies = [];
  let partitioned = [];

  try {
    cookies = await chrome.cookies.getAll({});
  } catch {}

  // Chrome 119+ partitioned cookies
  try {
    partitioned = await chrome.cookies.getAll({ partitionKey: {} });
  } catch {}

  const seen = new Set();
  const merged = [...cookies, ...partitioned].filter((c) => {
    const key = `${c.name}|${c.domain}|${c.path}|${c.storeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const normalizedCookies = includeCookies
    ? merged.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expiration_date: c.expirationDate ?? null,
      host_only: !c.domain.startsWith("."),
      http_only: c.httpOnly,
      same_site: c.sameSite ?? null,
      secure: c.secure,
      session: c.session,
      store_id: c.storeId ?? null,
    }))
    : [];

  const fetchContext = {
    user_agent: includeUA ? navigator.userAgent : null,
    headers: {},
    cookies: normalizedCookies,
    auth: null,
  };

  const response = await fetch("http://localhost:5678/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fetchContext),
  });

  const payload = await response.text();
  console.log("Context sent:", fetchContext);
  console.log("Received", payload);

  try {
    const json = JSON.parse(payload);
    document.getElementById("output").innerText += `SERVER: ${
      json?.data ?? json?.error
    }\n`;
  } catch {
    document.getElementById("output").innerText += `CLIENT: ${payload}\n`;
  }
});
