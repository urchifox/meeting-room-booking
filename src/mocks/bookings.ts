import type { BookingInfo } from "../types/types"

export const bookings = [
	{
		id: "1",
		date: "2026-10-28",
		start: "10:00",
		end: "11:00",
		title: "Meeting with John",
	},
	{
		id: "2",
		date: "2026-10-28",
		start: "11:00",
		end: "12:00",
	},
	{
		id: "3",
		date: "2026-10-29",
		start: "13:00",
		end: "14:00",
	},
] satisfies Array<BookingInfo>
