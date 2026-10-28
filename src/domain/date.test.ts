import type { HourMinute, YearMonthDay } from "../types/types"
import { getDayjs } from "./date"

describe("date", () => {
	it.each([
		{ date: "2026-10-28", time: "15:00" },
		{ date: "2024-02-29", time: "00:00" },
		{ date: "2026-12-31", time: "23:59" },
	] satisfies Array<{
		date: YearMonthDay
		time: HourMinute
	}>)("returns a Dayjs object for $date $time", ({ date, time }) => {
		const result = getDayjs({ date, time })

		expect(result.isValid()).toBe(true)
		expect(result.format("YYYY-MM-DD HH:mm")).toBe(`${date} ${time}`)
	})

	it.each([
		{ date: "2026-02-29", time: "15:00" },
		{ date: "2026-13-01", time: "15:00" },
		{ date: "2026-04-31", time: "15:00" },
		{ date: "2026-00-10", time: "15:00" },
		{ date: "2026-01-00", time: "15:00" },
	] satisfies Array<{
		date: YearMonthDay
		time: HourMinute
	}>)("rejects an invalid date $date", ({ date, time }) => {
		expect(() => getDayjs({ date, time })).toThrow(`Invalid date: ${date}`)
	})

	it.each([
		{ date: "2026-10-28", time: "24:00" },
		{ date: "2026-10-28", time: "23:60" },
		{ date: "2026-10-28", time: "99:00" },
	] satisfies Array<{
		date: YearMonthDay
		time: HourMinute
	}>)("rejects an invalid time $time", ({ date, time }) => {
		expect(() => getDayjs({ date, time })).toThrow(`Invalid time: ${time}`)
	})
})
