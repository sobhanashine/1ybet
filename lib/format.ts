import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import jalaliday from "jalaliday";
import { TIMEZONE } from "./config";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(jalaliday);

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

const FA_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function tehran(date: Date | string) {
  // jalaliday's typings don't expose .calendar(); cast through unknown.
  return (dayjs(date).tz(TIMEZONE) as unknown as {
    calendar: (c: string) => dayjs.Dayjs;
  }).calendar("jalali");
}

const FA_WEEKDAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
];

/** e.g. "شنبه، ۲۵ خرداد" */
export function formatJalaliDate(date: Date | string): string {
  const d = tehran(date);
  const weekday = FA_WEEKDAYS[d.day()];
  return `${weekday}، ${toPersianDigits(d.date())} ${FA_MONTHS[d.month()]}`;
}

/** e.g. "شنبه، ۲۵ خرداد ۱۴۰۵" */
export function formatJalaliDateFull(date: Date | string): string {
  const d = tehran(date);
  const weekday = FA_WEEKDAYS[d.day()];
  return `${weekday}، ${toPersianDigits(d.date())} ${FA_MONTHS[d.month()]} ${toPersianDigits(
    d.year(),
  )}`;
}

/** e.g. "۱۸:۳۰" (Tehran time) */
export function formatTime(date: Date | string): string {
  return toPersianDigits(dayjs(date).tz(TIMEZONE).format("HH:mm"));
}

/** YYYY-MM-DD key in Tehran tz, used to group fixtures by day */
export function tehranDayKey(date: Date | string): string {
  return dayjs(date).tz(TIMEZONE).format("YYYY-MM-DD");
}
