import {
	getBookings,
	sortBookings,
	tryAddBooking,
	tryDeleteBooking,
	tryUpdateBooking,
} from "../domain/bookings"
import type { BookingInfo, YearMonthDay } from "../types/types"
import {
	addBooking,
	deleteBooking,
	loadBookings,
	selectAllBookings,
	selectAllBookingsExcept,
	selectBookingById,
	selectDate,
	updateBooking,
} from "./bookingsSlice"
import { resetStore, store } from "./index"

const { today, currentTime } = vi.hoisted(() => {
	return {
		today: "2026-11-19" as const,
		currentTime: "09:00" as const,
	}
})

vi.mock("../domain/bookings", async () => {
	const actual =
		await vi.importActual<typeof import("../domain/bookings")>(
			"../domain/bookings"
		)
	return {
		...actual,
		getBookings: vi.fn(),
		sortBookings: vi.fn(actual.sortBookings),
		tryAddBooking: vi.fn(),
		tryDeleteBooking: vi.fn(),
		tryUpdateBooking: vi.fn(),
	}
})

vi.mock("../domain/date", async () => {
	const actual =
		await vi.importActual<typeof import("../domain/date")>("../domain/date")
	return {
		...actual,
		getToday: vi.fn(() => today),
		getCurrentTime: vi.fn(() => currentTime),
	}
})

const defaultDate = today
const otherDate = "2026-12-01" satisfies YearMonthDay

const planning = {
	id: "1",
	date: defaultDate,
	timeRange: { start: "10:00", end: "11:00" },
	title: "Planning",
} satisfies BookingInfo

const review = {
	id: "2",
	date: defaultDate,
	timeRange: { start: "14:00", end: "15:00" },
	title: "Review",
} satisfies BookingInfo

const bookingsOnDefaultDay = [planning] satisfies Array<BookingInfo>

function makeBookingOnDate(
	booking: BookingInfo,
	bookingDate: YearMonthDay
): BookingInfo {
	return { ...booking, date: bookingDate }
}

const validationErrors = ["The selected time is already booked"]

function load(nextBookings: Array<BookingInfo>, date: YearMonthDay = defaultDate) {
	vi.mocked(getBookings).mockResolvedValueOnce(nextBookings)
	return store.dispatch(loadBookings({ date: date })).unwrap()
}

describe("bookingsSlice", () => {
	beforeEach(() => {
		resetStore()
		vi.clearAllMocks()
	})

	describe("loadBookings", () => {
		it("stores bookings when the request finishes", async () => {
			vi.mocked(getBookings).mockResolvedValue(bookingsOnDefaultDay)
			await store.dispatch(loadBookings({ date: defaultDate })).unwrap()

			expect(sortBookings).toHaveBeenCalledExactlyOnceWith(bookingsOnDefaultDay)
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})

		it("does not store bookings when the request is aborted before it resolves", async () => {
			let resolveBookings: (value: Array<BookingInfo>) => void = () => {}
			vi.mocked(getBookings).mockImplementation(
				() =>
					new Promise((resolve) => {
						resolveBookings = resolve
					})
			)
			const request = store.dispatch(loadBookings({ date: defaultDate }))
			const settled = request.unwrap().then(
				() => ({ aborted: false }),
				(error: unknown) => ({ aborted: true, error })
			)

			request.abort()
			resolveBookings(bookingsOnDefaultDay)

			const result = await settled
			await Promise.resolve()

			expect(result).toMatchObject({
				aborted: true,
				error: { name: "AbortError" },
			})
			expect(store.getState().bookings).toBeNull()
		})

		it("replaces the loaded data when another date is requested", async () => {
			const bookingsOnOtherDay = [makeBookingOnDate(review, otherDate)]
			await load(bookingsOnDefaultDay)

			await load(bookingsOnOtherDay, otherDate)

			expect(store.getState().bookings).toEqual({
				date: otherDate,
				bookings: bookingsOnOtherDay,
			})
		})

		it("rejects and leaves the day unloaded when loading fails", async () => {
			vi.mocked(getBookings).mockRejectedValueOnce(new Error("offline"))
			await expect(
				store.dispatch(loadBookings({ date: defaultDate })).unwrap()
			).rejects.toBe("Failed to load bookings")
			expect(store.getState().bookings).toBeNull()
		})

		it("keeps the loaded bookings when a later load fails", async () => {
			await load(bookingsOnDefaultDay)
			vi.mocked(getBookings).mockRejectedValueOnce(new Error("offline"))

			await expect(
				store.dispatch(loadBookings({ date: otherDate })).unwrap()
			).rejects.toBe("Failed to load bookings")
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})
	})

	describe("addBooking", () => {
		it("stores a booking", async () => {
			const morning = {
				id: "morning",
				date: defaultDate,
				timeRange: { start: "09:00", end: "09:30" },
				title: "Morning",
			} satisfies BookingInfo
			vi.mocked(tryAddBooking).mockResolvedValue({ valid: true })
			await load([planning, review])

			await expect(
				store.dispatch(addBooking(morning)).unwrap()
			).resolves.toEqual({ valid: true })

			expect(tryAddBooking).toHaveBeenCalledExactlyOnceWith({
				booking: morning,
				otherBookings: [planning, review],
				today,
				currentTime,
			})
			expect(sortBookings).toHaveBeenCalledTimes(2)
			expect(store.getState().bookings?.bookings).toHaveLength(3)
			expect(store.getState().bookings?.bookings).toEqual(
				expect.arrayContaining([morning, planning, review])
			)
		})

		it("validates an added booking against the other saved bookings", async () => {
			const moved = {
				...planning,
				timeRange: { start: "16:00", end: "17:00" },
				title: "Moved",
			} satisfies BookingInfo
			vi.mocked(tryAddBooking).mockResolvedValue({ valid: true })
			await load([planning, review])

			await store.dispatch(addBooking(moved)).unwrap()

			expect(tryAddBooking).toHaveBeenCalledExactlyOnceWith({
				booking: moved,
				otherBookings: [review],
				today,
				currentTime,
			})
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: [planning, review, moved],
			})
		})

		it("does not store a booking before a day is loaded", async () => {
			vi.mocked(tryAddBooking).mockResolvedValue({ valid: true })

			await expect(
				store.dispatch(addBooking(planning)).unwrap()
			).resolves.toEqual({ valid: true })

			expect(tryAddBooking).toHaveBeenCalledExactlyOnceWith({
				booking: planning,
				otherBookings: [],
				today,
				currentTime,
			})
			expect(store.getState().bookings).toBeNull()
		})

		it("does not store a booking for a different day", async () => {
			const bookingOnOtherDay = {
				...makeBookingOnDate(planning, otherDate),
				id: "other-day",
			}
			vi.mocked(tryAddBooking).mockResolvedValue({ valid: true })
			await load(bookingsOnDefaultDay)

			await expect(
				store.dispatch(addBooking(bookingOnOtherDay)).unwrap()
			).resolves.toEqual({ valid: true })
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})

		it("rejects validation errors and keeps the loaded bookings", async () => {
			vi.mocked(tryAddBooking).mockResolvedValue({
				valid: false,
				errors: validationErrors,
			})
			await load(bookingsOnDefaultDay)

			await expect(store.dispatch(addBooking(review)).unwrap()).rejects.toEqual(
				validationErrors
			)
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})

		it("rejects when adding a booking fails", async () => {
			vi.mocked(tryAddBooking).mockRejectedValueOnce(new Error("offline"))
			await load(bookingsOnDefaultDay)

			await expect(store.dispatch(addBooking(review)).unwrap()).rejects.toBe(
				"Failed to add booking"
			)
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})
	})

	describe("updateBooking", () => {
		it("updates a booking", async () => {
			const updatedBooking = {
				...planning,
				timeRange: { start: "16:00", end: "17:00" },
				title: "Updated",
			} satisfies BookingInfo
			vi.mocked(tryUpdateBooking).mockResolvedValue({ valid: true })
			await load([planning, review])

			await expect(
				store.dispatch(updateBooking(updatedBooking)).unwrap()
			).resolves.toEqual({ valid: true })

			expect(tryUpdateBooking).toHaveBeenCalledExactlyOnceWith({
				booking: updatedBooking,
				otherBookings: [review],
			})
			expect(sortBookings).toHaveBeenCalledTimes(2)
			expect(store.getState().bookings?.bookings).toHaveLength(2)
			expect(store.getState().bookings?.bookings).toEqual(
				expect.arrayContaining([updatedBooking, review])
			)
		})

		it("does not update a booking before a day is loaded", async () => {
			vi.mocked(tryUpdateBooking).mockResolvedValue({ valid: true })
			await expect(
				store.dispatch(updateBooking(planning)).unwrap()
			).resolves.toEqual({ valid: true })

			expect(tryUpdateBooking).toHaveBeenCalledExactlyOnceWith({
				booking: planning,
				otherBookings: [],
			})
			expect(store.getState().bookings).toBeNull()
		})

		it("does not update a booking for a different day", async () => {
			const updatedBooking = {
				...planning,
				date: otherDate,
				title: "Elsewhere",
			} satisfies BookingInfo
			vi.mocked(tryUpdateBooking).mockResolvedValue({ valid: true })
			await load([planning, review])

			await expect(
				store.dispatch(updateBooking(updatedBooking)).unwrap()
			).resolves.toEqual({ valid: true })
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: [planning, review],
			})
		})

		it("does not update a booking that is not loaded", async () => {
			const missing = {
				...planning,
				id: "missing",
				title: "Missing",
			} satisfies BookingInfo
			vi.mocked(tryUpdateBooking).mockResolvedValue({ valid: true })
			await load([planning, review])

			await expect(
				store.dispatch(updateBooking(missing)).unwrap()
			).resolves.toEqual({ valid: true })

			expect(tryUpdateBooking).toHaveBeenCalledExactlyOnceWith({
				booking: missing,
				otherBookings: [planning, review],
			})
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: [planning, review],
			})
		})

		it("rejects validation errors and keeps the loaded bookings", async () => {
			vi.mocked(tryUpdateBooking).mockResolvedValue({
				valid: false,
				errors: validationErrors,
			})
			await load(bookingsOnDefaultDay)

			await expect(
				store.dispatch(updateBooking(planning)).unwrap()
			).rejects.toEqual(validationErrors)
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})

		it("rejects when updating a booking fails", async () => {
			vi.mocked(tryUpdateBooking).mockRejectedValueOnce(new Error("offline"))
			await load(bookingsOnDefaultDay)

			await expect(
				store.dispatch(updateBooking(planning)).unwrap()
			).rejects.toBe("Failed to update booking")
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})
	})

	describe("deleteBooking", () => {
		it("removes a booking from the loaded day", async () => {
			vi.mocked(tryDeleteBooking).mockResolvedValue({ valid: true })
			await load([planning, review])

			await expect(
				store.dispatch(deleteBooking(planning.id)).unwrap()
			).resolves.toEqual({ valid: true })

			expect(tryDeleteBooking).toHaveBeenCalledExactlyOnceWith(planning.id)
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: [review],
			})
		})

		it("does not remove a booking before a day is loaded", async () => {
			vi.mocked(tryDeleteBooking).mockResolvedValue({ valid: true })
			await expect(
				store.dispatch(deleteBooking(planning.id)).unwrap()
			).resolves.toEqual({ valid: true })

			expect(tryDeleteBooking).toHaveBeenCalledExactlyOnceWith(planning.id)
			expect(store.getState().bookings).toBeNull()
		})

		it("does not remove a booking that is not loaded", async () => {
			vi.mocked(tryDeleteBooking).mockResolvedValue({ valid: true })
			await load(bookingsOnDefaultDay)

			await expect(
				store.dispatch(deleteBooking("missing")).unwrap()
			).resolves.toEqual({ valid: true })
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})

		it("does not remove a booking from a different day", async () => {
			const bookingOnOtherDay = makeBookingOnDate(planning, otherDate)
			vi.mocked(tryDeleteBooking).mockResolvedValue({ valid: true })
			await load([bookingOnOtherDay])

			await expect(
				store.dispatch(deleteBooking(bookingOnOtherDay.id)).unwrap()
			).resolves.toEqual({ valid: true })
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: [bookingOnOtherDay],
			})
		})

		it("rejects validation errors and keeps the loaded bookings", async () => {
			vi.mocked(tryDeleteBooking).mockResolvedValue({
				valid: false,
				errors: ["Booking was not found"],
			})
			await load(bookingsOnDefaultDay)

			await expect(
				store.dispatch(deleteBooking(planning.id)).unwrap()
			).rejects.toEqual(["Booking was not found"])
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})

		it("rejects when deleting a booking fails", async () => {
			vi.mocked(tryDeleteBooking).mockRejectedValueOnce(new Error("offline"))
			await load(bookingsOnDefaultDay)

			await expect(
				store.dispatch(deleteBooking(planning.id)).unwrap()
			).rejects.toBe("Failed to delete booking")
			expect(store.getState().bookings).toEqual({
				date: defaultDate,
				bookings: bookingsOnDefaultDay,
			})
		})
	})

	describe("selectors", () => {
		it("falls back to default values before data is loaded", () => {
			const state = store.getState()

			expect(selectDate(state)).toBe(today)
			expect(selectAllBookings(state)).toBeNull()
			expect(selectAllBookingsExcept(state, planning.id)).toEqual([])
			expect(selectBookingById(state, planning.id)).toBeNull()
		})

		it("returns the loaded day and its bookings", async () => {
			const bookingOnOtherDayPlanning = makeBookingOnDate(planning, otherDate)
			const bookingOnOtherDayReview = makeBookingOnDate(review, otherDate)
			await load([bookingOnOtherDayPlanning, bookingOnOtherDayReview], otherDate)
			const state = store.getState()

			expect(selectDate(state)).toBe(otherDate)
			expect(selectAllBookings(state)).toEqual([
				bookingOnOtherDayPlanning,
				bookingOnOtherDayReview,
			])
			expect(selectAllBookingsExcept(state, bookingOnOtherDayPlanning.id)).toEqual([
				bookingOnOtherDayReview,
			])
			expect(selectBookingById(state, bookingOnOtherDayReview.id)).toEqual(
				bookingOnOtherDayReview
			)
			expect(selectBookingById(state, "missing")).toBeNull()
		})
	})
})
