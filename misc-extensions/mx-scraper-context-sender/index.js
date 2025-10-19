document.getElementById("sendBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const includeUA = document.getElementById("uaCheckbox").checked;
  const includeCookies = document.getElementById("cookiesCheckbox").checked;

  // Replaces content.js
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const userAgent = navigator.userAgent;
      const cookies = document.cookie.split("; ").filter(Boolean).map(
        (cookieStr) => {
          const [name, ...valParts] = cookieStr.split("=");
          return {
            name: name,
            value: valParts.join("="),
            domain: window.location.hostname,
            path: "/",
            expiration_date: null,
            host_only: true,
            http_only: null,
            same_site: null,
            secure: location.protocol === "https:",
            session: true,
            store_id: null,
          };
        },
      );

      return {
        user_agent: userAgent,
        headers: {
          // "User-Agent": userAgent, // done mx-scraper side
          "Referer": document.referrer || "",
        },
        cookies,
        auth: null,
      };
    },
  }, async (results) => {
    console.log(includeUA, includeCookies);

    let fetchContext = results[0].result;
    fetchContext = {
      ...fetchContext,
      user_agent: includeUA ? fetchContext.user_agent : null,
      cookies: includeCookies ? fetchContext.cookies : [],
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
    } catch (e) {
      document.getElementById("output").innerText += `CLIENT: ${payload}\n`;
    }
  });
});
