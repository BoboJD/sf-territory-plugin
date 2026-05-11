# Selector Strategy

## Salesforce Lightning UI constraints

The Territory Settings form renders inside a sub-iframe hosted on `salesforce-setup.com`, not the main Lightning shell frame. All locators must target `page.frames()` — not the main page.

Salesforce synthetic shadow DOM patches `document.querySelectorAll` to return nothing for shadow-encapsulated elements. Always use **Playwright locators** (`frame.locator()`, `frame.getByLabel()`), never `page.evaluate(() => document.querySelectorAll(...))`.

## Playwright timeout semantics

`timeout: 0` means **retry forever** in `isChecked()` and `isEnabled()` — not "return immediately". Only `isVisible({ timeout: 0 })` is the exception: it returns immediately when the element is absent.

**Pattern used throughout this codebase:**

```ts
// Existence gate — returns false immediately if absent
const exists = await locator.first().isVisible({ timeout: 0 }).catch(() => false);

// Read checked state without retry
const checked = await locator.first()
  .evaluate((el: HTMLInputElement) => el.checked)
  .catch(() => false);
```

Never use `locator.isChecked({ timeout: 0 })` as an existence check — it will hang indefinitely.

## Checkbox detection

The "Enable Leads" label text (`"Activer les pistes"` in French orgs) sits inside a `lightning-formatted-rich-text` LWC shadow component. CSS `:has-text()` selectors are unreliable here.

Use Playwright's shadow-DOM-piercing methods instead:

```ts
// Strategy 1: getByLabel (uses accessible name + label[for]/id association)
frame.getByLabel('Activer les pistes', { exact: false })

// Strategy 2: Aura container filtered by text (pierces shadow DOM)
frame.locator('.checkboxContainer')
  .filter({ hasText: 'Activer les pistes' })
  .locator('input[type="checkbox"]')
```

The Aura class `.checkboxContainer` and `.uiInputCheckbox` are locale-independent and reliable. Avoid generated dynamic class names.

## Radio buttons

Lead access radio buttons use `name="leadAccessLevel"` with **numeric** values (not string names):

- `value="1"` = ReadOnly
- `value="2"` = ReadWrite

```ts
frame.locator('input[type="radio"][name="leadAccessLevel"][value="2"]')
```

These radios only appear after "Enable Leads" is checked.

## Save button

The Save button has Aura class `button.saveButton`. Its `aria-label` is empty — aria-label selectors will not match it. Use:

```ts
frame.locator('button.saveButton')
// Fallback: frame.locator('button:has-text("Enregistrer")')
```

## Frame discovery

```ts
// Probe each non-main frame for form elements
for (const frame of page.frames()) {
  if (frame === page.mainFrame()) continue;
  const count = await frame.locator('.checkboxContainer').count();
  if (count > 0) return frame; // salesforce-setup.com sub-frame
}
return page.mainFrame(); // fallback
```
