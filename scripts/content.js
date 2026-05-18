(() => {
  const match = window.location.pathname.match(/(?:\/contest\/(\d+)\/problem|\/problemset\/problem\/(\d+))\/([A-Za-z0-9]+)/);
  if (!match) return;

  const contestId = match[1] || match[2];
  const problemIndex = match[3].toUpperCase();
  const problemKey = contestId + problemIndex;

  async function getRating() {
    try {
      let { cfRatings = {}, cfTime = 0 } = await chrome.storage.local.get(["cfRatings", "cfTime"]);
      const now = Date.now();
      const isTooOld = now - cfTime > 86400000; // 24 hours

      if (Object.keys(cfRatings).length === 0 || isTooOld) {
        try {
          const res = await fetch("https://codeforces.com/api/problemset.problems");
          if (res.ok) {
            const data = await res.json();

            cfRatings = {};

            for (const p of data.result.problems) {
              if (p.rating) {
                cfRatings[p.contestId + p.index] = p.rating;
              }
            }

            cfTime = now;
            await chrome.storage.local.set({ cfRatings, cfTime });
          }
        } catch (e) {
          console.error("Failed to fetch global problemset:", e);
        }
      }

      let rating = cfRatings[problemKey];

      if (!rating && cfRatings[problemKey] !== 'UNRATED') {
        try {
          const res = await fetch(`https://codeforces.com/api/contest.standings?contestId=${contestId}`);
          if (res.ok) {
            const data = await res.json();
            let madeChanges = false;

            for (const p of data.result.problems) {
              const key = p.contestId + p.index;

              if (p.rating && !cfRatings[key]) {
                cfRatings[key] = p.rating;
                madeChanges = true;
              }
            }

            if (!cfRatings[problemKey]) {
              cfRatings[problemKey] = 'UNRATED';
              madeChanges = true;
            }

            if (madeChanges) {
              await chrome.storage.local.set({ cfRatings });
            }

            rating = cfRatings[problemKey];
          }
        } catch (e) {
          console.error("Failed to fetch contest standings fallback:", e);
        }
      }

      if (!rating) return;
      if (rating === 'UNRATED') rating = 'N/A';

      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.insertAdjacentHTML("beforeend", `
          <div class="roundbox sidebox">
            <div class="roundbox-lt">&nbsp;</div><div class="roundbox-rt">&nbsp;</div>
            <div class="caption titled">→ Problem rate</div>
            <div><div style="margin:1em;font-size:0.8em;">
              <div class="roundbox" style="margin:2px; padding:0 3px 2px 3px; background-color:#f0f0f0; width: 4rem">
                <div class="roundbox-lt">&nbsp;</div><div class="roundbox-rt">&nbsp;</div>
                <div class="roundbox-lb">&nbsp;</div><div class="roundbox-rb">&nbsp;</div>
                <span class="tag-box" style="font-size:1.2rem;" title="Difficulty">*${rating}</span>
              </div>
            </div></div>
          </div>`);
      }
    } catch (err) {
      console.error("Extension Error:", err);
    }
  }

  getRating();
})();