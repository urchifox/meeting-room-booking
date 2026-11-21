import {
	getBookings,
	sortBookings,
	tryAddBooking,
	tryDeleteBooking,
	tryUpdateBooking,
} from "../domain/bookings"
import type { BookingInfo, YearMonthDay } from "../types/types"
import {
	type BookingsState,
	activateDate,
	addBooking,
	deleteBooking,
	loadBookingsForDay,
	selectActiveDate,
	selectBookingById,
	selectBookingsByDay,
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

const bookingOnMorning = {
	id: "1",
	date: defaultDate,
	timeRange: { start: "10:00", end: "11:00" },
	title: "Morning",
} satisfies BookingInfo

const bookingOnLunch = {
	id: "2",
	date: defaultDate,
	timeRange: { start: "13:00", end: "14:00" },
	title: "Lunch",
} satisfies BookingInfo

const bookingOnEvening = {
	id: "3",
	date: defaultDate,
	timeRange: { start: "17:00", end: "18:00" },
	title: "Evening",
} satisfies BookingInfo

const bookingsOnDefaultDay = [bookingOnMorning] satisfies Array<BookingInfo>

function makeBookingOnDate(
	booking: BookingInfo,
	bookingDate: YearMonthDay
): BookingInfo {
	return { ...booking, date: bookingDate }
}

const validationErrors = ["The selected time is already booked"]

type LoadOptions = {
	date?: YearMonthDay
	setDay?: boolean
}

function dispatchLoadBookings(date: YearMonthDay) {
	return store.dispatch(loadBookingsForDay(date))
}

type LoadResult = ReturnType<typeof dispatchLoadBookings>

function load(props: LoadOptions & { bookings: Array<BookingInfo> }): LoadResult
function load(
	props: LoadOptions & { promise: Promise<Array<BookingInfo>> }
): LoadResult
function load(props: LoadOptions & { error: Error }): LoadResult
function load(props?: LoadOptions): LoadResult
function load({
	bookings,
	promise,
	error,
	date = defaultDate,
	setDay = false,
}: LoadOptions & {
	bookings?: Array<BookingInfo>
	promise?: Promise<Array<BookingInfo>>
	error?: Error
} = {}): LoadResult {
	if (bookings !== undefined) {
		vi.mocked(getBookings).mockResolvedValueOnce(bookings)
	} else if (promise !== undefined) {
		vi.mocked(getBookings).mockReturnValueOnce(promise)
	} else if (error !== undefined) {
		vi.mocked(getBookings).mockRejectedValueOnce(error)
	}
	if (setDay) {
		store.dispatch(activateDate(date))
	}
	return dispatchLoadBookings(date)
}

function createDeferred<T>() {
	let resolve: (value: T) => void = () => {}
	const promise = new Promise<T>((res) => {
		resolve = res
	})
	return { promise, resolve }
}

function expectState(expectedState: BookingsState) {
	const state = store.getState().bookings
	if (expectedState === null) {
		expect(state).toBeNull()
	} else {
		expect(state).toEqual(expectedState)
	}
}

function expectActiveDate(expectedDate: YearMonthDay) {
	expect(selectActiveDate(store.getState())).toBe(expectedDate)
}

function expectBookingsOf(
	date: YearMonthDay,
	expectedBookings: Array<BookingInfo>
) {
	expect(selectBookingsByDay(store.getState(), date)).toEqual(expectedBookings)
}

describe("bookingsSlice", () => {
	beforeEach(() => {
		resetStore()
		vi.resetAllMocks()
	})

	describe("loadBookingsForDay", () => {
		it("stores sorted bookings and activates the requested day", async () => {
			const bookings = [bookingOnLunch, bookingOnMorning]
			const expectedBookings = [bookingOnMorning, bookingOnLunch]

			await load({ bookings, setDay: true }).unwrap()

			expect(getBookings).toHaveBeenCalledExactlyOnceWith(defaultDate)
			expect(sortBookings).toHaveBeenCalledExactlyOnceWith(bookings)
			expectState({
				activeDate: defaultDate,
				bookingsByDate: { [defaultDate]: expectedBookings },
			})
		})

		it("does not store bookings when the request is aborted before it resolves", async () => {
			const { promise, resolve } = createDeferred<Array<BookingInfo>>()
			const request = load({ promise, setDay: true })
			const settled = request.unwrap().then(
				() => ({ aborted: false }),
				(error) => ({ aborted: true, error })
			)

			request.abort()
			resolve(bookingsOnDefaultDay)

			await expect(settled).resolves.toMatchObject({
				aborted: true,
				error: { name: "AbortError" },
			})
			expectState({
				activeDate: defaultDate,
				bookingsByDate: {},
			})
			expect(selectBookingsByDay(store.getState(), defaultDate)).toBeNull()
		})

		it("activates the day when an earlier same-day request was aborted", async () => {
			const bookingsOnOtherDay = [makeBookingOnDate(bookingOnLunch, otherDate)]
			await load({ bookings: bookingsOnDefaultDay, setDay: true }).unwrap()

			const { promise, resolve } = createDeferred<Array<BookingInfo>>()
			const first = load({
				promise,
				date: otherDate,
				setDay: true,
			})
			const second = load({
				date: otherDate,
				setDay: true,
			})

			first.abort()
			resolve(bookingsOnOtherDay)

			await expect(first.unwrap()).rejects.toMatchObject({
				name: "AbortError",
			})
			await second.unwrap()

			expect(getBookings).toHaveBeenCalledTimes(2)
			expectActiveDate(otherDate)
			expectBookingsOf(otherDate, bookingsOnOtherDay)
		})

		it("keeps earlier days and activates the newly requested day", async () => {
			const bookingsOnOtherDay = [makeBookingOnDate(bookingOnLunch, otherDate)]
			await load({ bookings: bookingsOnDefaultDay, setDay: true }).unwrap()
			await load({
				bookings: bookingsOnOtherDay,
				date: otherDate,
				setDay: true,
			}).unwrap()

			expectState({
				activeDate: otherDate,
				bookingsByDate: {
					[defaultDate]: bookingsOnDefaultDay,
					[otherDate]: bookingsOnOtherDay,
				},
			})
		})

		it("returns a stored day without requesting it again", async () => {
			const bookingsOnOtherDay = [
				makeBookingOnDate(bookingOnMorning, otherDate),
			]
			await load({ bookings: [] }).unwrap()
			await load({
				bookings: bookingsOnOtherDay,
				date: otherDate,
				setDay: true,
			}).unwrap()

			await load({ setDay: true }).unwrap()

			expect(getBookings).toHaveBeenCalledTimes(2)
			expectBookingsOf(defaultDate, [])
			expectActiveDate(defaultDate)
		})

		it("shares one in-flight request for the same day", async () => {
			const { promise, resolve } = createDeferred<Array<BookingInfo>>()

			const first = load({ promise, setDay: true }).unwrap()
			const second = load({}).unwrap()
			resolve(bookingsOnDefaultDay)

			await expect(Promise.all([first, second])).resolves.toEqual([
				bookingsOnDefaultDay,
				bookingsOnDefaultDay,
			])
			expect(getBookings).toHaveBeenCalledExactlyOnceWith(defaultDate)
		})

		it("activates the latest requested day when responses arrive out of order", async () => {
			const bookingsOnOtherDay = [makeBookingOnDate(bookingOnLunch, otherDate)]
			const defaultDayResponse = createDeferred<Array<BookingInfo>>()
			const otherDayResponse = createDeferred<Array<BookingInfo>>()

			const defaultDayLoad = load({
				promise: defaultDayResponse.promise,
				setDay: true,
			})
			const otherDayLoad = load({
				promise: otherDayResponse.promise,
				date: otherDate,
				setDay: true,
			})

			otherDayResponse.resolve(bookingsOnOtherDay)
			await otherDayLoad.unwrap()
			defaultDayResponse.resolve(bookingsOnDefaultDay)
			await defaultDayLoad.unwrap()

			expectActiveDate(otherDate)
			expectBookingsOf(defaultDate, bookingsOnDefaultDay)
			expectBookingsOf(otherDate, bookingsOnOtherDay)
		})

		it("does not activate a day loaded with setDay false", async () => {
			await load({ bookings: bookingsOnDefaultDay, setDay: true }).unwrap()
			await load({ bookings: [], date: otherDate }).unwrap()

			expectActiveDate(defaultDate)
			expectBookingsOf(otherDate, [])
		})

		it("rejects and leaves the day unloaded when loading fails", async () => {
			await expect(
				load({ error: new Error("offline"), setDay: true }).unwrap()
			).rejects.toBe("Failed to load bookings")
			expectState({
				activeDate: defaultDate,
				bookingsByDate: {},
			})
			expect(selectBookingsByDay(store.getState(), defaultDate)).toBeNull()

			await load({ bookings: bookingsOnDefaultDay }).unwrap()

			expect(getBookings).toHaveBeenCalledTimes(2)
			expectBookingsOf(defaultDate, bookingsOnDefaultDay)
		})

		it("keeps cached bookings when a later activated day fails to load", async () => {
			await load({ bookings: bookingsOnDefaultDay, setDay: true }).unwrap()

			await expect(
				load({
					error: new Error("offline"),
					date: otherDate,
					setDay: true,
				}).unwrap()
			).rejects.toBe("Failed to load bookings")
			expectState({
				activeDate: otherDate,
				bookingsByDate: { [defaultDate]: bookingsOnDefaultDay },
			})
			expect(selectBookingsByDay(store.getState(), otherDate)).toBeNull()
		})
	})

	describe("addBooking", () => {
		it("stores a booking after validating against the other bookings of that day", async () => {
			vi.mocked(tryAddBooking).mockResolvedValue({ valid: true })
			await load({ bookings: [bookingOnMorning] }).unwrap()

			await store.dispatch(addBooking(bookingOnLunch)).unwrap()

			expect(tryAddBooking).toHaveBeenCalledExactlyOnceWith({
				booking: bookingOnLunch,
				otherBookings: [bookingOnMorning],
				today,
				currentTime,
			})
			expectBookingsOf(defaultDate, [bookingOnMorning, bookingOnLunch])
		})

		it("excludes the booking id from the other bookings used for validation", async () => {
			const bookingWithExistingId = {
				...bookingOnEvening,
				id: bookingOnLunch.id,
			}
			vi.mocked(tryAddBooking).mockResolvedValue({ valid: true })
			await load({ bookings: [bookingOnMorning, bookingOnLunch] }).unwrap()

			await store.dispatch(addBooking(bookingWithExistingId)).unwrap()

			expect(tryAddBooking).toHaveBeenCalledExactlyOnceWith({
				booking: bookingWithExistingId,
				otherBookings: [bookingOnMorning],
				today,
				currentTime,
			})
		})

		it("loads the day before validating when it is not stored yet", async () => {
			vi.mocked(getBookings).mockResolvedValueOnce([bookingOnLunch])
			vi.mocked(tryAddBooking).mockResolvedValue({ valid: true })

			await store.dispatch(addBooking(bookingOnMorning)).unwrap()

			expect(getBookings).toHaveBeenCalledExactlyOnceWith(defaultDate)
			expect(tryAddBooking).toHaveBeenCalledExactlyOnceWith({
				booking: bookingOnMorning,
				otherBookings: [bookingOnLunch],
				today,
				currentTime,
			})
			expectActiveDate(today)
			expectBookingsOf(defaultDate, [bookingOnMorning, bookingOnLunch])
		})

		it("stores a booking for another day without activating it", async () => {
			const bookingOnOtherDay = makeBookingOnDate(bookingOnLunch, otherDate)
			vi.mocked(tryAddBooking).mockResolvedValue({ valid: true })
			await load({ bookings: bookingsOnDefaultDay, setDay: true }).unwrap()
			vi.mocked(getBookings).mockResolvedValueOnce([])

			await store.dispatch(addBooking(bookingOnOtherDay)).unwrap()

			expectActiveDate(defaultDate)
			expectBookingsOf(otherDate, [bookingOnOtherDay])
		})

		it("rejects without validating when the day cannot be loaded", async () => {
			vi.mocked(getBookings).mockRejectedValueOnce(new Error("offline"))

			await expect(
				store.dispatch(addBooking(bookingOnMorning)).unwrap()
			).rejects.toBe("Bookings not found")
			expect(tryAddBooking).not.toHaveBeenCalled()
		})

		it("rejects validation errors and keeps the loaded bookings", async () => {
			vi.mocked(tryAddBooking).mockResolvedValue({
				valid: false,
				errors: validationErrors,
			})
			await load({ bookings: bookingsOnDefaultDay }).unwrap()

			await expect(
				store.dispatch(addBooking(bookingOnLunch)).unwrap()
			).rejects.toEqual(validationErrors)
			expectBookingsOf(defaultDate, bookingsOnDefaultDay)
		})

		it("rejects when adding a booking fails", async () => {
			vi.mocked(tryAddBooking).mockRejectedValueOnce(new Error("offline"))
			await load({ bookings: bookingsOnDefaultDay }).unwrap()

			await expect(
				store.dispatch(addBooking(bookingOnLunch)).unwrap()
			).rejects.toBe("Failed to add booking")
			expectBookingsOf(defaultDate, bookingsOnDefaultDay)
		})
	})

	describe("updateBooking", () => {
		it("updates a booking on the active day", async () => {
			const updatedLunch = {
				...bookingOnLunch,
				timeRange: bookingOnEvening.timeRange,
				title: bookingOnEvening.title,
			}
			vi.mocked(tryUpdateBooking).mockResolvedValue({ valid: true })
			await load({
				bookings: [bookingOnMorning, bookingOnLunch],
				setDay: true,
			}).unwrap()

			await store.dispatch(updateBooking(updatedLunch)).unwrap()

			expect(tryUpdateBooking).toHaveBeenCalledExactlyOnceWith({
				booking: updatedLunch,
				otherBookings: [bookingOnMorning],
			})
			expectBookingsOf(defaultDate, [bookingOnMorning, updatedLunch])
		})

		it("moves a booking to another day and keeps the active day", async () => {
			const bookingOnMorningMoved = makeBookingOnDate(
				bookingOnMorning,
				otherDate
			)
			const bookingOnLunchMoved = makeBookingOnDate(bookingOnLunch, otherDate)
			vi.mocked(tryUpdateBooking).mockResolvedValue({ valid: true })
			await load({
				bookings: [bookingOnMorning, bookingOnLunch],
				setDay: true,
			}).unwrap()
			vi.mocked(getBookings).mockResolvedValueOnce([bookingOnLunchMoved])

			await store.dispatch(updateBooking(bookingOnMorningMoved)).unwrap()

			expect(getBookings).toHaveBeenLastCalledWith(otherDate)
			expect(tryUpdateBooking).toHaveBeenCalledExactlyOnceWith({
				booking: bookingOnMorningMoved,
				otherBookings: [bookingOnLunchMoved],
			})
			expectActiveDate(defaultDate)
			expectBookingsOf(defaultDate, [bookingOnLunch])
			expectBookingsOf(otherDate, [bookingOnMorningMoved, bookingOnLunchMoved])
		})

		it("rejects without validating when the day cannot be loaded", async () => {
			vi.mocked(getBookings).mockRejectedValueOnce(new Error("offline"))

			await expect(
				store.dispatch(updateBooking(bookingOnMorning)).unwrap()
			).rejects.toBe("Bookings not found")
			expect(tryUpdateBooking).not.toHaveBeenCalled()
		})

		it("rejects validation errors and keeps the loaded bookings", async () => {
			vi.mocked(tryUpdateBooking).mockResolvedValue({
				valid: false,
				errors: validationErrors,
			})
			await load({ bookings: bookingsOnDefaultDay }).unwrap()

			await expect(
				store.dispatch(updateBooking(bookingOnMorning)).unwrap()
			).rejects.toEqual(validationErrors)
			expectBookingsOf(defaultDate, bookingsOnDefaultDay)
		})

		it("rejects when updating a booking fails", async () => {
			vi.mocked(tryUpdateBooking).mockRejectedValueOnce(new Error("offline"))
			await load({ bookings: bookingsOnDefaultDay }).unwrap()

			await expect(
				store.dispatch(updateBooking(bookingOnMorning)).unwrap()
			).rejects.toBe("Failed to update booking")
			expectBookingsOf(defaultDate, bookingsOnDefaultDay)
		})
	})

	describe("deleteBooking", () => {
		it("removes a booking from the active day", async () => {
			vi.mocked(tryDeleteBooking).mockResolvedValue({ valid: true })
			await load({
				bookings: [bookingOnMorning, bookingOnLunch],
				setDay: true,
			}).unwrap()

			await store.dispatch(deleteBooking(bookingOnMorning.id)).unwrap()

			expect(tryDeleteBooking).toHaveBeenCalledExactlyOnceWith(
				bookingOnMorning.id
			)
			expectBookingsOf(defaultDate, [bookingOnLunch])
		})

		it("removes a booking from another day", async () => {
			vi.mocked(tryDeleteBooking).mockResolvedValue({ valid: true })
			await load({
				bookings: bookingsOnDefaultDay,
				setDay: true,
			}).unwrap()
			const bookingOnOtherDay = makeBookingOnDate(bookingOnEvening, otherDate)
			await load({
				bookings: [bookingOnOtherDay],
				date: otherDate,
			}).unwrap()

			await store.dispatch(deleteBooking(bookingOnOtherDay.id)).unwrap()

			expect(tryDeleteBooking).toHaveBeenCalledExactlyOnceWith(
				bookingOnOtherDay.id
			)
			expectBookingsOf(defaultDate, bookingsOnDefaultDay)
			expectBookingsOf(otherDate, [])
		})

		it("does not remove a booking before a day is loaded", async () => {
			vi.mocked(tryDeleteBooking).mockResolvedValue({ valid: true })

			await store.dispatch(deleteBooking(bookingOnMorning.id)).unwrap()

			expectState(null)
		})

		it("rejects validation errors and keeps the loaded bookings", async () => {
			vi.mocked(tryDeleteBooking).mockResolvedValue({
				valid: false,
				errors: ["Booking was not found"],
			})
			await load({ bookings: bookingsOnDefaultDay }).unwrap()

			await expect(
				store.dispatch(deleteBooking(bookingOnMorning.id)).unwrap()
			).rejects.toEqual(["Booking was not found"])
			expectBookingsOf(defaultDate, bookingsOnDefaultDay)
		})

		it("rejects when deleting a booking fails", async () => {
			vi.mocked(tryDeleteBooking).mockRejectedValueOnce(new Error("offline"))
			await load({ bookings: bookingsOnDefaultDay }).unwrap()

			await expect(
				store.dispatch(deleteBooking(bookingOnMorning.id)).unwrap()
			).rejects.toBe("Failed to delete booking")
			expectBookingsOf(defaultDate, bookingsOnDefaultDay)
		})
	})

	describe("selectors", () => {
		it("falls back before data is loaded and reads by day after", async () => {
			expectActiveDate(today)
			expect(selectBookingsByDay(store.getState(), defaultDate)).toBeNull()
			expect(
				selectBookingById(store.getState(), defaultDate, bookingOnMorning.id)
			).toBeNull()

			const bookingOnOtherDay = makeBookingOnDate(bookingOnLunch, otherDate)
			await load({
				bookings: [bookingOnOtherDay],
				date: otherDate,
				setDay: true,
			}).unwrap()

			expectActiveDate(otherDate)
			expectBookingsOf(otherDate, [bookingOnOtherDay])
			expect(selectBookingsByDay(store.getState(), defaultDate)).toBeNull()
			expect(
				selectBookingById(store.getState(), otherDate, bookingOnOtherDay.id)
			).toEqual(bookingOnOtherDay)
			expect(
				selectBookingById(store.getState(), otherDate, "missing")
			).toBeNull()
		})
	})
})
