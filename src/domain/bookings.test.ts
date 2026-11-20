import { getBookingsFromServer } from "../services/serverAdapter"
import type { BookingInfo, HourMinute, YearMonthDay } from "../types/types"
import {
	excludeBooking,
	sortBookings,
	tryAddBooking,
	tryDeleteBooking,
	tryUpdateBooking,
} from "./bookings"

const booking = {
	id: "domain-server-error",
	date: "2026-12-01",
	timeRange: { start: "10:00", end: "11:00" },
	title: "Domain test",
} satisfies BookingInfo

const today = "2026-11-18" satisfies YearMonthDay
const currentTime = "09:00" satisfies HourMinute

describe("bookings server errors", () => {
	afterEach(async () => {
		await tryDeleteBooking(booking.id)
	})

	it.each([
		{
			bookings: [
				{
					id: "afternoon",
					date: "2026-12-01",
					timeRange: { start: "14:00", end: "15:00" },
					title: "Afternoon",
				},
				{
					id: "morning",
					date: "2026-12-01",
					timeRange: { start: "09:00", end: "10:00" },
					title: "Morning",
				},
			],
			expected: [
				{
					id: "morning",
					date: "2026-12-01",
					timeRange: { start: "09:00", end: "10:00" },
					title: "Morning",
				},
				{
					id: "afternoon",
					date: "2026-12-01",
					timeRange: { start: "14:00", end: "15:00" },
					title: "Afternoon",
				},
			],
		},
		{
			bookings: [
				{
					id: "early",
					date: "2026-12-01",
					timeRange: { start: "08:30", end: "09:00" },
					title: "Early",
				},
				{
					id: "midday",
					date: "2026-12-01",
					timeRange: { start: "12:00", end: "13:00" },
					title: "Midday",
				},
			],
			expected: [
				{
					id: "early",
					date: "2026-12-01",
					timeRange: { start: "08:30", end: "09:00" },
					title: "Early",
				},
				{
					id: "midday",
					date: "2026-12-01",
					timeRange: { start: "12:00", end: "13:00" },
					title: "Midday",
				},
			],
		},
		{
			bookings: [
				{
					id: "early-second-day",
					date: "2026-12-02",
					timeRange: { start: "08:30", end: "09:00" },
					title: "Early second day",
				},
				{
					id: "midday-first-day",
					date: "2026-12-01",
					timeRange: { start: "12:00", end: "13:00" },
					title: "Midday first day",
				},
			],
			expected: [
				{
					id: "midday-first-day",
					date: "2026-12-01",
					timeRange: { start: "12:00", end: "13:00" },
					title: "Midday first day",
				},
				{
					id: "early-second-day",
					date: "2026-12-02",
					timeRange: { start: "08:30", end: "09:00" },
					title: "Early second day",
				},
			],
		},
	] satisfies Array<{ bookings: BookingInfo[]; expected: BookingInfo[] }>)(
		"sorts bookings by start time",
		({ bookings, expected }) => {
			const sortedBookings = sortBookings(bookings)

			expect(sortedBookings).toEqual(expected)
			expect(sortedBookings).not.toBe(bookings)
		}
	)

	describe("excludeBooking", () => {
		const morning = {
			id: "morning",
			date: "2026-12-01",
			timeRange: { start: "09:00", end: "10:00" },
			title: "Morning",
		} satisfies BookingInfo

		const afternoon = {
			id: "afternoon",
			date: "2026-12-01",
			timeRange: { start: "14:00", end: "15:00" },
			title: "Afternoon",
		} satisfies BookingInfo

		it("removes the booking with the given id", () => {
			const bookings = [morning, afternoon]

			expect(excludeBooking(bookings, morning.id)).toEqual([afternoon])
		})

		it("returns the same bookings when the id is not found", () => {
			const bookings = [morning, afternoon]

			expect(excludeBooking(bookings, "missing")).toEqual(bookings)
		})

		it("returns an empty list when the only booking matches", () => {
			expect(excludeBooking([morning], morning.id)).toEqual([])
		})

		it("does not mutate the original list", () => {
			const bookings = [morning, afternoon]
			const excluded = excludeBooking(bookings, morning.id)

			expect(excluded).not.toBe(bookings)
			expect(bookings).toEqual([morning, afternoon])
		})
	})

	it("does not add a booking when the server rejects it", async () => {
		const created = await tryAddBooking({
			booking,
			otherBookings: [],
			today,
			currentTime,
		})
		expect(created).toEqual({ valid: true })

		const duplicate = await tryAddBooking({
			booking,
			otherBookings: [],
			today,
			currentTime,
		})
		expect(duplicate).toEqual({
			valid: false,
			errors: ["A booking with this id already exists"],
		})

		const stored = await getBookingsFromServer(booking.date)
		expect(stored.body.filter((item) => item.id === booking.id)).toHaveLength(1)
	})

	it("does not update a booking when the server cannot find it", async () => {
		const result = await tryUpdateBooking({
			booking: { ...booking, id: "missing-booking" },
			otherBookings: [],
		})

		expect(result).toEqual({
			valid: false,
			errors: ["Booking was not found"],
		})

		const stored = await getBookingsFromServer(booking.date)
		expect(stored.body.some((item) => item.id === "missing-booking")).toBe(
			false
		)
	})

	it("does not delete a booking when the server cannot find it", async () => {
		const before = await getBookingsFromServer("2026-10-28")
		const result = await tryDeleteBooking("missing-booking")

		expect(result).toEqual({
			valid: false,
			errors: ["Booking was not found"],
		})

		const after = await getBookingsFromServer("2026-10-28")
		expect(after.body).toEqual(before.body)
	})
})
