# Актуална композиция — 2026-10-08

На лицето остава само сайтът в най-долната безопасна позиция. Личният имейл и телефонът са премахнати. Текстът за наградата е свален с 1 mm, чрез отстояние 1.7 mm над абзаца; запазени са размерът 8 pt и синият удебелен акцент „безплатен ИИ одит“. QR полето е 23 mm, а стъпките са вдясно от него.

На гърба инструкцията е премахната. Шестте въпроса и изводът запазват текста, позициите и шрифта. Синкаво поле съдържа само извода. Поканата е извън него, с 1.5 mm отстояние и около 1.1 mm по-ниско от предходния вариант. Контактите са подредени сайт → office@ittdigitalhub.org → +359 895 581 911, ляво подравнени, с еднакъв шрифт 7.5 pt, тегло 400 и приглушен цвят #465473.

Логата използват обща геометрия: 23 × 4.7917 mm, x/y 7 mm спрямо bleed. Прозрачните 14 реда над знака са компенсирани с -0.4193 mm, така че видимото лого достига максималната горна позиция при 4 mm безопасно поле. Заглавията са точно 18 px / 13.5 pt. Размерът остава 65 × 90 mm, с 3 mm bleed и минимум 4 mm safety за основното съдържание; долното поле на контактите на гърба е 3 mm по изричното ново решение на потребителя.

## Проверки

- Визуално прегледани последните 300 dpi PDF изображения на двете страни.
- В браузъра: инструкцията липсва, поканата е извън back-summary, лицето има само сайт, контактите на гърба са в правилния ред. Логата имат идентични измерени координати и размери.
- Действителни viewport ширини 1440, 1280, 768 и 390 px: без хоризонтално преливане или преливане на важните контейнери.
- Typecheck на инструмента и 5/5 geometry теста преминаха. Общият website check премина; има 5 съществуващи lint предупреждения.
- Последен preflight: 97 PASS, 0 N/A, 0 FAIL. Проверени размери, безопасно поле, текст, шрифтове, QR и четирите A4 копия.
- Запазени са останалият одобрен текст, QR destination, print.json, geometry.mjs и export.mjs. Доказателство: output/print/card-comments-preservation.json.

PDF файловете са RGB. Налични са калибрация и номерирана проба за проверка на физическото двустранно подравняване.

## Допълнително сваляне на контактите

Потребителят избра 3 mm долно поле. Само back-footer е преместен с 1 mm надолу. Телефонът има около 3.06 mm долно отстояние по текстовия диапазон. Лицето е byte-identical в PDF PNG; останалите важни елементи на гърба имат идентични текст, шрифтове, позиции и размери. PDF export, print geometry и QR configuration са непроменени. Одобреното изключение е записано в config/artwork.json и се проверява само за трите контактни реда, включително текстовите диапазони. Доказателство: output/print/lower-back-contacts-preservation.json.

След последната промяна viewport 1440/1280/768/390 px са проверени отново без преливане. Повторният общ website check премина: 388 теста, 2 пропуснати и успешен build; има 5 съществуващи lint предупреждения. Първоначалният синтактичен проблем в несвързания memory.ts вече не се проявява.

## Финален 8-up пакет — 2026-10-08

Одобрените дизайни са заключени. Единичните FRONT/BACK PDF файлове са запазени byte-for-byte в validation/approved; същите 300 dpi рендери и всички artwork source hashes са непроменени. Променена е само imposition/preview/export документацията и логика.

Прегледани са и двете 300 dpi страници на production master (297 × 210 mm, 8 лица / 8 гърба), и двете номерирани registration страници и двете calibration страници. Производственият master е без номера, правоъгълници за регистрация и editing overlays. Няма crop marks върху bleed. Периферните ножове са видими, всеки trim edge има отметка, 71 × 96 mm footprint-ите се допират без застъпване. Текстът и логото са изправени; дизайнът съвпада с одобрените единични страни.

Номерираната проба показва F1 F2 F3 F4 / F5 F6 F7 F8 и B4 B3 B2 B1 / B8 B7 B6 B5. Асиметричните кръстове са поставени върху светла област. Реалните PDF координати на всички маркери са проверени независимо срещу физическото обръщане по късия ръб. Калибрацията съдържа A–D, ясни инструкции и линия 100 mm, без конфликт между инструкциите и trim линиите.

- 8-up: **152 PASS, 0 N/A, 0 FAIL**. Всички 16 imposed изображения са сравнени с одобрените индивидуални рендери; всички осем QR кода се декодират.
- 4-up алтернатива: **136 PASS, 0 N/A, 0 FAIL**; отделен output/4up пакет. Typecheck и **11/11 geometry tests** преминаха за двете ориентации/duplex режими и X/Y офсети.
- Общият website check премина: **389 tests passed, 2 skipped**, успешен Next build; 5 съществуващи lint предупреждения.
- Браузърът по подразбиране показва два 8-up landscape листа на 40%. Проверени са реални viewport ширини **1440, 1280, 768, 390 px**: document width съвпада с viewport, по осем карти на страна и няма clipping вътре в картите. Малките екрани могат да скролират A4 canvas при избран по-голям мащаб. Проверени са 4-up selector, 16 editing guides и F/B номерата; overlays са изключени след проверката.

Дигитална геометрична толерантност 0.01 mm. Физическите принтерни полета трябва да позволяват отметките на 5 mm от ръба. Не е извършен физически печат. Преди тираж: calibration → всички осем F/B двойки → една отрязана карта върху реалния картон. Препоръчани настройки: landscape / short-edge / 100% / 19 duplex copies = 152 карти преди отпадък. RGB, без CMYK/PDF-X сертификат.

## 2026-10-08 - User-authorized contact centering and headline contrast

- Centered all three back contact lines while preserving their font size and bottom position.
- Darkened the front/back hero gradient to #01091f / #07183d and lightened only the hero headline accents to #6290ff. Minimum screen contrast across the gradient: 5.76:1.
- Pixel comparison at 300 dpi: zero changes outside the two hero areas and back contacts. Approved source lock refreshed for this explicit user revision; content, dimensions, QR, fonts, assets and other layout preserved.
- Regenerated both print presets and visually inspected the individual artwork and imposed sheet. Digital preflight: 152/152 for 8-up and 136/136 for 4-up. Root npm run check passed (389 tests passed, 2 skipped; existing lint warnings).
- Actual browser widths 1440, 1280, 768 and 390 verified, without document overflow; all eight back contact blocks centered.

## 2026-10-08 - User-authorized gold headline accents

- Changed only the front headline emphasis and back headline accents from #6290ff to #FFD166.
- 300 dpi pixel comparison: zero changes outside the headline text bounds on either side. Existing background, centered contacts, wording, typography and dimensions preserved.
- Reviewed the regenerated individual artwork in the browser and rendered PDF preview. Actual viewport widths 1440, 1280, 768 and 390 verified with no document overflow.
- 8-up preflight passed 152/152; root npm run check passed.

## 2026-10-08 - Restore original blue and lighten the gradient

- User requested the original saturated blue from before the two color revisions. Restored #002CFF for the three hero headline accents.
- Preserved the original radial gradient shape and made its colors slightly lighter than the original: #051238 base, #0D2B67 highlight.
- Pixel comparison at 300 dpi: zero changes outside the hero areas on either side. Contacts, QR, typography, content, lower blocks and dimensions preserved.
- Regenerated and inspected the individual artwork and browser preview. Actual widths 1440, 1280, 768 and 390 verified without document overflow. Restarted the local dev preview after the interrupted session.
- Print preflight passed 152/152 for 8-up and 136/136 for 4-up. Root npm run check passed.
