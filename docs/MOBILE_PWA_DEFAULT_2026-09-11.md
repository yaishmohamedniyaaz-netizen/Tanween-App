# PWA normal-launch correction

The installed app starts at `/`. The approved mobile calibration previously required `?mobileCalibration=1`, so it disappeared on a normal PWA launch even after a successful update.

The approved presentation now defaults on. Existing portrait, fixed-artwork, and prepared/live judging gates remain in App. `?mobileCalibration=0` remains a comparison opt-out. No manifest identity, saved preferences, scoring, records, artwork, or service-worker activation behavior changes.

Validation: 19 focused tests passed; production build passed. Browser inspection of query-free localhost at 390×844 confirmed calibration enabled; 844×390 landscape confirmed it disabled. This verifies the launch URL gate, not physical-device update activation. The preceding correction pass supplies the layout and navigation evidence.

Existing installed copies still need the normal safe update cycle: after judging, close all Tahqeeq windows on that device and reopen while online. No reinstall or storage clearing is required.

Owner authorized this follow-up after publication. Confidence: practicality 98/100, architecture/data safety 98/100, visual certainty 90/100 for retaining the already reviewed layout; native phone acceptance remains separate.
