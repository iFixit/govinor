import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(calendar);
dayjs.extend(duration);
dayjs.extend(relativeTime);

export function getHumanReadableDateTime(date: dayjs.Dayjs) {
  return date.calendar(null, {
    sameDay: "[today at] H:mm:ss",
    nextDay: "[tomorrow at] H:mm:ss",
    nextWeek: "dddd [at] H:mm:ss",
    lastDay: "[yesterday at] H:mm:ss",
    lastWeek: "[last] dddd [at] H:mm:ss",
    sameElse: "DD/MM/YYYY [at] H:mm:ss",
  });
}

export function getHumanReadableDuration(
  beginDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
): string | null {
  if (beginDate.isValid() && endDate.isValid()) {
    const duration = dayjs.duration(endDate.diff(beginDate));
    let humanReadableDuration = "";
    const minutes = duration.minutes();
    if (minutes >= 1) {
      humanReadableDuration += `${Math.floor(minutes)}m`;
    }
    const seconds = duration.seconds();
    humanReadableDuration += `${seconds}s`;
    return humanReadableDuration;
  }
  return null;
}
