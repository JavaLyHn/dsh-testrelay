const assert = require('node:assert/strict');

// Run on a dedicated DSH Web page with a completed run open in TestRelay.
// Native wheel input is essential: locator.click / scrollIntoView will also
// scroll overflow:hidden ancestors, masking the bug this check covers.
async function checkSidebarWheel(page) {
  const panel = page.locator('.tr-panel:visible');
  const history = panel.locator('.tr-history-row').last();
  await history.waitFor({ state: 'attached' });
  for (const selector of ['.tr-handoff', '.tr-history']) {
    await panel.locator(selector).evaluate(el => { el.open = true; });
  }
  const header = panel.locator('.tr-brandbar');
  const point = await header.boundingBox();
  assert.ok(point, 'Expected a visible TestRelay sidebar');
  // Keep the pointer in the panel gutter, outside nested editors and buttons.
  await page.mouse.move(point.x + 5, point.y + 12);
  const visibleInPane = el => {
    const { left, right, top, bottom } = el.getBoundingClientRect();
    const x = (left + right) / 2;
    return [top + 1, bottom - 1].every(y => el.contains(document.elementFromPoint(x, y)));
  };
  const lastRow = await history.elementHandle();
  const brandbar = await header.elementHandle();
  try {
    await page.mouse.wheel(0, -10000);
    await page.waitForFunction(visibleInPane, brandbar, { timeout: 2500 });
    assert.equal(await history.evaluate(visibleInPane), false,
      'Fixture must overflow the sidebar; use a shorter viewport or more runs');
    await page.mouse.wheel(0, 10000);
    await page.waitForFunction(visibleInPane, lastRow, { timeout: 2500 }).catch(() => {
      assert.fail('Wheeling down did not reveal the last run in the sidebar');
    });
    await page.mouse.wheel(0, -10000);
    await page.waitForFunction(visibleInPane, brandbar, { timeout: 2500 });
  } finally {
    await lastRow.dispose();
    await brandbar.dispose();
  }
}

module.exports = { checkSidebarWheel };
