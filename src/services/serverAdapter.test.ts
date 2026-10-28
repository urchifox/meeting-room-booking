import type { BookingInfo } from "../types/types"
import {
	addBookingToServer,
	deleteBookingFromServer,
	getBookingsFromServer,
	updateBookingOnServer,
} from "./serverAdapter"

const booking = {
	id: "server-test",
	date: "2026-10-28",
	timeRange: { start: "17:00", end: "18:00" },
	title: "Server test",
} satisfies BookingInfo

describe("mockServer", () => {
	afterEach(async () => {
		await deleteBookingFromServer(booking.id)
	})

	it("creates, reads, updates, and deletes a booking", async () => {
		const created = await addBookingToServer(booking)
		expect(created.statusCode).toBe(200)
		if (created.statusCode === 200) {
			created.body.title = "changed by caller"
		}

		const duplicate = await addBookingToServer(booking)
		expect(duplicate).toEqual({
			statusCode: 409,
			message: "A booking with this id already exists",
		})

		const listed = await getBookingsFromServer(booking.date)
		expect(listed.body.find((item) => item.id === booking.id)?.title).toBe(
			"Server test"
		)

		const updated = await updateBookingOnServer({
			...booking,
			date: "2026-10-30",
			timeRange: { start: "17:00", end: "17:30" },
			title: undefined,
		})
		expect(updated.statusCode).toBe(200)
		if (updated.statusCode === 200) {
			expect(updated.body).toEqual({
				id: booking.id,
				date: "2026-10-30",
				timeRange: { start: "17:00", end: "17:30" },
			})
		}

		const previousDay = await getBookingsFromServer(booking.date)
		expect(previousDay.body.some((item) => item.id === booking.id)).toBe(false)

		const nextDay = await getBookingsFromServer("2026-10-30")
		expect(nextDay.body.some((item) => item.id === booking.id)).toBe(true)

		const missing = await updateBookingOnServer({
			...booking,
			id: "missing-booking",
		})
		expect(missing).toEqual({
			statusCode: 404,
			message: "Booking was not found",
		})

		const removed = await deleteBookingFromServer(booking.id)
		expect(removed.statusCode).toBe(200)

		const afterDelete = await getBookingsFromServer("2026-10-30")
		expect(afterDelete.body.some((item) => item.id === booking.id)).toBe(false)

		const missingDelete = await deleteBookingFromServer(booking.id)
		expect(missingDelete).toEqual({
			statusCode: 404,
			message: "Booking was not found",
		})
	})
})
