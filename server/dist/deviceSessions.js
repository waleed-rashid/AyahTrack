"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachDeviceSessionSummaries = void 0;
const emptySessionSummary = () => ({
    sabaqSeconds: 0,
    sabaqParaSeconds: 0,
    revisionSeconds: 0,
});
const getDayStart = (date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    return dayStart;
};
const getDayKey = (date) => {
    const dayStart = getDayStart(date);
    const year = dayStart.getFullYear();
    const month = String(dayStart.getMonth() + 1).padStart(2, "0");
    const day = String(dayStart.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const attachDeviceSessionSummaries = async ({ prisma, userId, entries, }) => {
    if (entries.length === 0) {
        return entries;
    }
    const entryDayStarts = entries.map((entry) => getDayStart(entry.date).getTime());
    const rangeStart = new Date(Math.min(...entryDayStarts));
    const rangeEnd = new Date(Math.max(...entryDayStarts));
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    const sessions = await prisma.deviceSession.findMany({
        where: {
            userId,
            date: {
                gte: rangeStart,
                lt: rangeEnd,
            },
        },
        select: {
            date: true,
            sabaqSeconds: true,
            sabaqParaSeconds: true,
            revisionSeconds: true,
        },
    });
    const sessionSummaries = sessions.reduce((summaries, session) => {
        const dayKey = getDayKey(session.date);
        const summary = summaries[dayKey] || emptySessionSummary();
        summary.sabaqSeconds += session.sabaqSeconds;
        summary.sabaqParaSeconds += session.sabaqParaSeconds;
        summary.revisionSeconds += session.revisionSeconds;
        summaries[dayKey] = summary;
        return summaries;
    }, {});
    return entries.map((entry) => ({
        ...entry,
        deviceSession: sessionSummaries[getDayKey(entry.date)] || emptySessionSummary(),
    }));
};
exports.attachDeviceSessionSummaries = attachDeviceSessionSummaries;
