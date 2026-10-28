import { getBookingsFromServer } from "../services/serverAdapter"
import type { BookingInfo } from "../types/types"
import { tryAddBooking, tryDeleteBooking, tryUpdateBooking } from "./bookings"

const booking = {
	id: "domain-server-error",
	date: "2026-12-01",
	timeRange: { start: "10:00", end: "11:00" },
	title: "Domain test",
} satisfies BookingInfo

describe("bookings server errors", () => {
	afterEach(async () => {
		await tryDeleteBooking(booking.id)
	})

	it("does not add a booking when the server rejects it", async () => {
		const created = await tryAddBooking({ booking, otherBookings: [] })
		expect(created).toEqual({ valid: true })

		const duplicate = await tryAddBooking({ booking, otherBookings: [] })
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
