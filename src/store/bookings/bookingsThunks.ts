import {
	type ThunkDispatch,
	type UnknownAction,
	createAsyncThunk,
} from "@reduxjs/toolkit"

import type { RootState } from ".."
import {
	excludeBooking,
	getBookings,
	tryAddBooking,
	tryDeleteBooking,
	tryUpdateBooking,
} from "../../domain/bookings"
import { getCurrentTime, getToday } from "../../domain/date"
import type {
	BookingInfo,
	ValidationResult,
	YearMonthDay,
} from "../../types/types"
import { bookingsSlice, selectBookingsByDay } from "./bookingsSlice"
import { BookingsStatus, BookingsThunkType } from "./types"

const pendingLoads = new Map<YearMonthDay, Promise<Array<BookingInfo>>>()

export function clearPendingLoads() {
	pendingLoads.clear()
}

export const loadBookingsForDay = createAsyncThunk<
	Array<BookingInfo>,
	YearMonthDay,
	{ state: RootState; rejectValue: string }
>(
	BookingsThunkType.LOAD_FOR_DAY,
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

				const existedPromise = pendingLoads.get(date)
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
				pendingLoads.set(date, newPromise)
				const newBookings = await newPromise
				pendingLoads.delete(date)
				return newBookings
			})()

			onFulfilled(bookings)
			return bookings
		} catch (_) {
			pendingLoads.delete(date)
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
		if (selectBookingsByDay(getState(), date) !== BookingsStatus.LOADING) {
			return
		}
		if (Array.isArray(result)) {
			dispatch(
				bookingsSlice.actions.setBookingsForDate({
					date,
					bookings: result,
				})
			)
		} else {
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

export const retryLoadBookingsForDay = createAsyncThunk<
	Array<BookingInfo>,
	YearMonthDay,
	{ state: RootState; rejectValue: string }
>(BookingsThunkType.RETRY_LOAD_FOR_DAY, (date, { dispatch }) => {
	dispatch(bookingsSlice.actions.removeBookingsForDate(date))
	return dispatch(loadBookingsForDay(date)).unwrap()
})

export const addBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo,
	{ state: RootState; rejectValue: Array<string> | string }
>(
	BookingsThunkType.ADD,
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
	{
		condition: (_, { getState }) => !getState().bookings.isMutationPending,
	}
)

export const updateBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo,
	{ state: RootState; rejectValue: Array<string> | string }
>(
	BookingsThunkType.UPDATE,
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
				today: getToday(),
				currentTime: getCurrentTime(),
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
	{
		condition: (_, { getState }) => !getState().bookings.isMutationPending,
	}
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
	{ state: RootState; rejectValue: Array<string> | string }
>(
	BookingsThunkType.DELETE,
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
	{
		condition: (_, { getState }) => !getState().bookings.isMutationPending,
	}
)
