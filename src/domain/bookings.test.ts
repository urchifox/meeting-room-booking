import { getBookingsFromServer } from "../services/serverAdapter"
import type { BookingInfo, HourMinute, YearMonthDay } from "../types/types"
import { tryAddBooking, tryDeleteBooking, tryUpdateBooking } from "./bookings"

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
