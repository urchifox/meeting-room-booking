import {
	type PayloadAction,
	type ThunkDispatch,
	type UnknownAction,
	createAsyncThunk,
	createSlice,
	isFulfilled,
	isPending as isPendingAction,
	isRejected,
} from "@reduxjs/toolkit"

import type { RootState } from "."
import {
	excludeBooking,
	getBookings,
	sortBookings,
	tryAddBooking,
	tryDeleteBooking,
	tryUpdateBooking,
} from "../domain/bookings"
import { getCurrentTime, getToday } from "../domain/date"
import type {
	BookingInfo,
	ValidationResult,
	YearMonthDay,
} from "../types/types"

export type BookingsState = {
	activeDate: YearMonthDay
	bookingsByDate: BookingsByDate
}

type BookingsByDate = Partial<
	Record<YearMonthDay, Array<BookingInfo> | BookingsStatus>
>

export enum BookingsStatus {
	LOADING = "LOADING",
	ERROR = "ERROR",
}

const initialState = {
	activeDate: getToday(),
	bookingsByDate: {},
} as BookingsState

const mapOfLoads = new Map<YearMonthDay, Promise<Array<BookingInfo>>>()

export const loadBookingsForDay = createAsyncThunk<
	Array<BookingInfo>,
	YearMonthDay,
	{ state: RootState; rejectValue: string }
>(
	"bookings/loadBookingsForDay",
	async (date, { getState, dispatch, rejectWithValue, signal }) => {
		const onFulfilled = (result: Array<BookingInfo> | BookingsStatus) => {
			onLoadFulfilled({
				result,
				date,
				dispatch,
				getState,
				aborted: signal.aborted,
			})
		}

		try {
			const bookings = await (async function () {
				const storedBookings = selectBookingsByDay(getState(), date)
				if (Array.isArray(storedBookings)) {
					return storedBookings
				}

				const existedPromise = mapOfLoads.get(date)
				if (existedPromise !== undefined) {
					return await existedPromise
				}

				dispatch(
					bookingsSlice.actions.setBookingsForDate({
						date,
						bookings: BookingsStatus.LOADING,
					})
				)

				const newPromise = getBookings(date)
				mapOfLoads.set(date, newPromise)
				const newBookings = await newPromise
				mapOfLoads.delete(date)
				return newBookings
			})()

			onFulfilled(bookings)
			return bookings
		} catch (_) {
			mapOfLoads.delete(date)
			onFulfilled(BookingsStatus.ERROR)
			return rejectWithValue("Failed to load bookings")
		}
	}
)

function onLoadFulfilled({
	result,
	date,
	dispatch,
	getState,
	aborted,
}: {
	result: Array<BookingInfo> | BookingsStatus
	date: YearMonthDay
	dispatch: ThunkDispatch<RootState, unknown, UnknownAction>
	getState: () => RootState
	aborted: boolean
}) {
	if (aborted) {
		if (selectBookingsByDay(getState(), date) === BookingsStatus.LOADING) {
			dispatch(bookingsSlice.actions.removeBookingsForDate(date))
		}
	} else {
		dispatch(
			bookingsSlice.actions.setBookingsForDate({
				date,
				bookings: result,
			})
		)
	}
}

let isPending: boolean = false

export const addBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo,
	{ state: RootState; rejectValue: Array<string> | string }
>(
	"bookings/addBooking",
	async (booking, { dispatch, rejectWithValue, getState }) => {
		const otherBookings = await getOtherBookings({
			booking,
			dispatch,
			getState,
		})
		if (otherBookings === null) {
			return rejectWithValue("Bookings not found")
		}

		try {
			const result = await tryAddBooking({
				booking,
				otherBookings,
				today: getToday(),
				currentTime: getCurrentTime(),
			})
			if (!result.valid) {
				return rejectWithValue(result.errors)
			}
			dispatch(bookingsSlice.actions.addBooking(booking))
			return result
		} catch (_) {
			return rejectWithValue("Failed to add booking")
		}
	},
	{ condition: () => !isPending }
)

export const updateBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo,
	{ state: RootState; rejectValue: Array<string> | string }
>(
	"bookings/updateBooking",
	async (booking, { dispatch, rejectWithValue, getState }) => {
		const otherBookings = await getOtherBookings({
			booking,
			dispatch,
			getState,
		})
		if (otherBookings === null) {
			return rejectWithValue("Bookings not found")
		}

		try {
			const result = await tryUpdateBooking({
				booking,
				otherBookings,
			})
			if (!result.valid) {
				return rejectWithValue(result.errors)
			}
			dispatch(bookingsSlice.actions.updateBooking(booking))
			return result
		} catch (_) {
			return rejectWithValue("Failed to update booking")
		}
	},
	{ condition: () => !isPending }
)

async function getOtherBookings({
	booking,
	dispatch,
	getState,
}: {
	booking: BookingInfo
	dispatch: ThunkDispatch<RootState, unknown, UnknownAction>
	getState: () => RootState
}) {
	let bookingsOfDate = selectBookingsByDay(getState(), booking.date)

	if (!Array.isArray(bookingsOfDate)) {
		await dispatch(loadBookingsForDay(booking.date))
		bookingsOfDate = selectBookingsByDay(getState(), booking.date)
		if (!Array.isArray(bookingsOfDate)) {
			return null
		}
	}

	const otherBookings = excludeBooking(bookingsOfDate, booking.id)
	return otherBookings
}

export const deleteBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo["id"],
	{ rejectValue: Array<string> | string }
>(
	"bookings/deleteBooking",
	async (id, { dispatch, rejectWithValue }) => {
		try {
			const result = await tryDeleteBooking(id)
			if (!result.valid) {
				return rejectWithValue(result.errors)
			}
			dispatch(bookingsSlice.actions.deleteBooking(id))
			return result
		} catch (_) {
			return rejectWithValue("Failed to delete booking")
		}
	},
	{ condition: () => !isPending }
)

const bookingsSlice = createSlice({
	name: "bookings",
	initialState,
	reducers: {
		activateDate: (
			state: BookingsState,
			action: PayloadAction<YearMonthDay>
		) => {
			;(Object.keys(state.bookingsByDate) as Array<YearMonthDay>).forEach(
				(date) => {
					const bookings = getBookingsByDay(state, date)
					if (bookings === BookingsStatus.ERROR) {
						delete state.bookingsByDate[date]
					}
				}
			)
			state.activeDate = action.payload
		},

		setBookingsForDate: (
			state: BookingsState,
			action: PayloadAction<{
				date: YearMonthDay
				bookings: Array<BookingInfo> | BookingsStatus
			}>
		) => {
			const { date, bookings } = action.payload
			const valueToSet = Array.isArray(bookings)
				? sortBookings(bookings)
				: bookings
			state.bookingsByDate[date] = valueToSet
		},

		removeBookingsForDate: (
			state: BookingsState,
			action: PayloadAction<YearMonthDay>
		) => {
			delete state.bookingsByDate[action.payload]
		},

		addBooking: (state: BookingsState, action: PayloadAction<BookingInfo>) => {
			const bookingDate = action.payload.date
			const bookingsOfDate = getBookingsByDay(state, bookingDate)
			if (!Array.isArray(bookingsOfDate)) {
				return
			}
			bookingsOfDate.push(action.payload)
			state.bookingsByDate[bookingDate] = sortBookings(bookingsOfDate)
		},

		updateBooking: (
			state: BookingsState,
			action: PayloadAction<BookingInfo>
		) => {
			const updatedBooking = action.payload

			const requestedBooking = getBookingById(state, updatedBooking.id)
			if (requestedBooking === null) {
				return
			}

			const initialDate = requestedBooking.date
			const bookingsOfInitialDay = getBookingsByDay(state, initialDate)
			if (!Array.isArray(bookingsOfInitialDay)) {
				return
			}
			state.bookingsByDate[initialDate] = excludeBooking(
				bookingsOfInitialDay,
				updatedBooking.id
			)

			const updatedDate = updatedBooking.date
			const bookingsOfUpdatedDay = getBookingsByDay(state, updatedDate)
			if (!Array.isArray(bookingsOfUpdatedDay)) {
				return
			}
			state.bookingsByDate[updatedDate] = sortBookings([
				...bookingsOfUpdatedDay,
				updatedBooking,
			])
		},

		deleteBooking: (state: BookingsState, action: PayloadAction<string>) => {
			const id = action.payload
			const requestedBooking = getBookingById(state, id)
			if (requestedBooking === null) {
				return
			}

			const bookingsOfDate = getBookingsByDay(state, requestedBooking.date)
			if (!Array.isArray(bookingsOfDate)) {
				return
			}
			state.bookingsByDate[requestedBooking.date] = excludeBooking(
				bookingsOfDate,
				id
			)
		},

		reset: () => {
			mapOfLoads.clear()
			isPending = false
			return initialState
		},
	},

	extraReducers: (builder) => {
		builder
			.addMatcher(
				isPendingAction(addBooking, updateBooking, deleteBooking),
				() => {
					isPending = true
				}
			)
			.addMatcher(isFulfilled(addBooking, updateBooking, deleteBooking), () => {
				isPending = false
			})
			.addMatcher(isRejected(addBooking, updateBooking, deleteBooking), () => {
				isPending = false
			})
	},

	selectors: {
		selectActiveDate: getActiveDate,
		selectBookingsByDay: getBookingsByDay,
		selectBookingById: getBookingById,
	},
})

function getActiveDate(state: BookingsState) {
	return state.activeDate ?? getToday()
}

function getBookingsByDay(state: BookingsState, date: YearMonthDay) {
	return state.bookingsByDate[date] ?? null
}

function getBookingById(
	state: BookingsState,
	id: BookingInfo["id"],
	date?: YearMonthDay
) {
	const bookingsToSearch =
		date === undefined
			? Object.values(state.bookingsByDate)
					.flat()
					.filter((item) => typeof item !== "string" && item !== undefined)
			: getBookingsByDay(state, date)
	if (!Array.isArray(bookingsToSearch)) {
		return null
	}
	return (
		bookingsToSearch.find(
			(booking) => typeof booking !== "string" && booking?.id === id
		) ?? null
	)
}

export const bookingsReducer = bookingsSlice.reducer
export const { activateDate, reset } = bookingsSlice.actions
export const { selectActiveDate, selectBookingsByDay, selectBookingById } =
	bookingsSlice.selectors
