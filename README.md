# Aladdin KIDS Audition Studio

A teacher-facing audition dashboard. `Index.html` and `Code.gs` are the Google Apps Script interface and server, bound to the results spreadsheet. `host.html` is the separate hosted page that embeds the deployed dashboard. The Drive folder and spreadsheet permissions must be configured in the school account.

To update the interface, copy `Index.html` into the Apps Script project and deploy a new web app version. The roster comes from the Drive folder dynamically; videos are shown in numeric filename order. Teachers can navigate with Back, Next, or the student selector, grade three categories, and suggest a role.

The current app uses an entered name rather than authenticated teacher identity. Its deployed link has been configured for broad access, so anyone who can use the link may be able to read or overwrite evaluations by entering a teacher's name. The embedded videos have their own Drive permissions.
