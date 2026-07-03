# Nuxt UI Port Audit

Date: 2026-07-02

## Documentation Checked

- Nuxt UI App: `https://ui.nuxt.com/docs/components/app`
- Nuxt UI Button: `https://ui.nuxt.com/docs/components/button#variant`
- Nuxt UI Input: `https://ui.nuxt.com/docs/components/input#icon`
- Nuxt UI Select: `https://ui.nuxt.com/docs/components/select`
- Nuxt UI Textarea: `https://ui.nuxt.com/docs/components/textarea`
- Nuxt UI Icon: `https://ui.nuxt.com/docs/components/icon`

## Inventory

- `UApp`: app shell wrapper.
- `UButton`: navigation tabs, modal actions, row actions, quick actions, pagination, account actions.
- `UInput`: auth email, search fields, date/number/text fields, compact quantity field.
- `USelect`: food filters, page size, settings timezone.
- `UTextarea`: food notes.
- `UIcon`: brand, metric, meal, helper, and source icons.

## Findings

- `UApp` is used correctly as the root wrapper.
- `UButton` props are mostly correct: `icon`, `color`, `variant`, `size`, `square`, `loading`, and `disabled` match the documented API. The dashboard Meal and modal Save Meal buttons should match through documented props: default primary color, `variant="soft"`, and `icon="i-lucide-clipboard-pen-line"`.
- `UInput` props are mostly correct, but legacy CSS was overriding Nuxt UI internal input padding. This broke documented `icon + placeholder` spacing. Native input CSS should exclude Nuxt UI `data-slot="base"` controls.
- Search inputs should use documented `icon`, `placeholder`, `size`, and `variant` props instead of custom input padding.
- `USelect` uses documented `v-model` and `items`. Filter selects should use `size`/`variant` props for compact styling instead of descendant CSS where practical. The unlabeled food filter select should have an `aria-label`.
- `UTextarea` uses documented `v-model`. Native textarea CSS should also avoid overriding Nuxt UI internals if Nuxt UI marks the inner control with `data-slot="base"`.
- `UIcon` uses documented `name` props. Decorative icons should keep `aria-hidden="true"` where they do not add accessible meaning.
- Several scoped styles still target raw descendant `button`, `input`, or `select` elements. These should be narrowed to non-Nuxt native controls or replaced with Nuxt UI props to avoid accidental layout and cursor bugs.

## Fixes Applied In This Audit

- Exclude Nuxt UI base inputs/textareas from global native form-control CSS.
- Scope legacy disabled button cursor styles away from Nuxt UI buttons.
- Restore documented `UInput icon + placeholder` usage for the meal search field.
- Use documented `size` and `variant` props for compact search/filter controls.
- Add missing accessible labels to select/search controls where the visible label is absent.
- Replace broad descendant CSS with Nuxt UI props or scoped non-Nuxt selectors.
