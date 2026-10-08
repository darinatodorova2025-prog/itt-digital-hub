import type { LiveReviewItem } from "./review";

export const REVIEW_PREVIEW_KEY = "mahni-live-review-preview";

export const REVIEW_PREVIEW_ITEMS: LiveReviewItem[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Ръчно преписване на протоколи",
    description: "Протоколите се преписват и после се търсят на ръка.",
    formulationNote: "Двата текста говорят за един и същ ръчен протокол: преписване и последващо търсене. Заглавието събира и двете.",
    isAiWildcard: false,
    sources: [
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", body: "Преписваме протоколите на ръка след всяка среща." },
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", body: "После търсим в тези протоколи кой какво е казал." },
    ],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Едни и същи справки всяка седмица",
    description: "Справките се събират от няколко места и се повтарят.",
    formulationNote: "И двете идеи описват повтаряща се справка. Формулировката ги събира в едно изречение.",
    isAiWildcard: false,
    sources: [
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", body: "Всяка седмица събираме едни и същи числа от три файла." },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2", body: "Справката се прави наново, вместо да се обновява предишната." },
    ],
  },
];
