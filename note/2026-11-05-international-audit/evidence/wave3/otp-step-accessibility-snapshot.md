# OTP step accessibility evidence (local, 2026-11-05T23:39:43.522Z)

## Code input attributes

```json
{
  "type": "text",
  "name": null,
  "id": null,
  "ariaLabel": null,
  "ariaLabelledby": null,
  "autocomplete": "one-time-code",
  "inputmode": "numeric",
  "hasLabelElement": false
}
```

## Accessibility tree (Playwright ariaSnapshot)

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- heading "Check your email" [level=1]
- paragraph: We sent a 6-digit code to otp-a11y-1793921982541@example.test
- textbox
- button "Verify email" [disabled]
- paragraph:
  - text: Didn't receive it?
  - button "Resend code"
- paragraph:
  - text: Wrong email?
  - button "Go back"
- button "Nodbusiness AI"
- button "Page guide"
- region "Notifications alt+T"
- alert
```
