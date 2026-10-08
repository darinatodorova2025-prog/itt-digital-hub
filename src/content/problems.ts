import type { L } from "@/lib/i18n";

export interface ProblemClass {
  code: string;
  title: L;
  body: L;
}

/** Homepage cards. The dedicated “Какво решаваме” page uses `solvePageProblems`. */
export const problemClasses: ProblemClass[] = [
  {
    code: "01",
    title: { bg: "Една и съща работа се повтаря", en: "The same work keeps repeating" },
    body: {
      bg: "Данни се въвеждат повторно, справки се подготвят ръчно, а едни и същи проверки отнемат време всеки ден.",
      en: "Data is entered more than once, reports are prepared manually and the same checks take up time every day.",
    },
  },
  {
    code: "02",
    title: { bg: "Информацията е там, но трудно се намира", en: "The information exists, but it is hard to find" },
    body: {
      bg: "Документи, таблици, имейли и вътрешни системи съдържат различни части от необходимата информация. Намирането и сверяването ѝ се превръща в отделна задача.",
      en: "Documents, spreadsheets, emails and internal systems each contain part of what is needed. Finding and verifying the information becomes a task of its own.",
    },
  },
  {
    code: "03",
    title: { bg: "Системите не работят заедно", en: "Systems do not work together" },
    body: {
      bg: "Когато инструментите не обменят информация, хората трябва да прехвърлят данни между тях. Това забавя работата и затруднява проследяването.",
      en: "When tools cannot exchange information, people have to move data between them. This slows work down and makes it harder to track.",
    },
  },
];

/** “Какво решаваме” page. Deliberately not a repeat of the homepage cards. */
export const solvePageProblems: ProblemClass[] = [
  {
    code: "01",
    title: { bg: "Твърде много работа се извършва ръчно", en: "Too much of the work is still manual" },
    body: {
      bg: "Данни се прехвърлят между системи. Документи се проверяват един по един. Една и съща информация се въвежда на няколко места. Експерти прекарват време в задачи, които не изискват експертните им знания.",
      en: "Data is moved between systems. Documents are checked one by one. The same information is entered in several places. Experts spend time on tasks that do not need their expertise.",
    },
  },
  {
    code: "02",
    title: { bg: "Информацията съществува, но трудно се използва", en: "The information exists, but it is hard to use" },
    body: {
      bg: "Знанието е разпределено между документи, таблици, имейли, вътрешни системи и хора. Намирането на правилната информация се превръща в самостоятелна задача.",
      en: "Knowledge is spread across documents, spreadsheets, email, internal systems and people. Finding the right information becomes a task of its own.",
    },
  },
  {
    code: "03",
    title: { bg: "Процесът преминава през твърде много несвързани инструменти", en: "The process runs through too many disconnected tools" },
    body: {
      bg: "Всеки отделен инструмент може да работи добре, но връзките между тях остават ръчни. Именно там обикновено възникват забавяне, пропуски и трудна проследимост.",
      en: "Each tool may work well on its own, while the links between them stay manual. That is usually where delay, gaps and weak traceability appear.",
    },
  },
];
