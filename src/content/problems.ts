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
    title: { bg: "Рутината отнема капацитет", en: "Routine work uses up capacity" },
    body: {
      bg: "Проверки, прехвърляне на данни, търсене на информация и административни стъпки заемат време, което може да бъде използвано за по-важна работа.",
      en: "Checks, moving data, searching for information and administrative steps take time that could go to more important work.",
    },
  },
  {
    code: "02",
    title: { bg: "Информацията е на много места", en: "Information sits in too many places" },
    body: {
      bg: "Документи, таблици, имейли и различни системи съдържат части от един и същ процес. Резултатът е търсене, дублиране и трудна проследимост.",
      en: "Documents, spreadsheets, email and separate systems each hold part of the same process. The result is searching, duplication and weak traceability.",
    },
  },
  {
    code: "03",
    title: { bg: "Системите не следват процеса", en: "Systems do not follow the process" },
    body: {
      bg: "Когато инструментите не обменят информация или не отразяват начина, по който екипът действително работи, хората компенсират ръчно.",
      en: "When tools do not exchange information, or do not reflect how the team actually works, people fill the gaps by hand.",
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
