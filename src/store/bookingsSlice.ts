import {
	type PayloadAction,
	createAsyncThunk,
	createSlice,
} from "@reduxjs/toolkit"

import type { RootState } from "."
import {
	getBookings,
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

type BookingsState = {
	date: YearMonthDay
	bookings: Array<BookingInfo>
} | null

const initialState = null as BookingsState

export const loadBookings = createAsyncThunk<
	Array<BookingInfo>,
	{ date: YearMonthDay },
	{ rejectValue: string }
>("bookings/loadBookings", async (arg, { dispatch, rejectWithValue }) => {
	try {
		const bookings = await getBookings(arg.date)
		dispatch(bookingsSlice.actions.setBookings({ date: arg.date, bookings }))
		return bookings
	} catch (_) {
		return rejectWithValue("Failed to load bookings")
	}
})

export const addBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo,
	{ rejectValue: Array<string> }
>(
	"bookings/addBooking",
	async (booking, { dispatch, rejectWithValue, getState }) => {
		const otherBookings = selectAllBookingsExcept(
			getState() as RootState,
			booking.id
		)
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
			return rejectWithValue(["Failed to add booking"])
		}
	}
)

export const updateBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo,
	{ rejectValue: Array<string> }
>(
	"bookings/updateBooking",
	async (booking, { dispatch, rejectWithValue, getState }) => {
		const otherBookings = selectAllBookingsExcept(
			getState() as RootState,
			booking.id
		)
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
			return rejectWithValue(["Failed to update booking"])
		}
	}
)

export const deleteBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo["id"],
	{ rejectValue: Array<string> }
>("bookings/deleteBooking", async (id, { dispatch, rejectWithValue }) => {
	try {
		const result = await tryDeleteBooking(id)
		if (!result.valid) {
			return rejectWithValue(result.errors)
		}
		dispatch(bookingsSlice.actions.deleteBooking(id))
		return result
	} catch (_) {
		return rejectWithValue(["Failed to delete booking"])
	}
})

const bookingsSlice = createSlice({
	name: "bookings",
	initialState,
	reducers: {
		setBookings: (
			_,
			action: PayloadAction<{
				date: YearMonthDay
				bookings: Array<BookingInfo>
			}>
		) => {
			const { date, bookings } = action.payload
			return {
				date,
				bookings: bookings.sort((a, b) =>
					a.timeRange.start.localeCompare(b.timeRange.start)
				),
			}
		},

		addBooking: (state: BookingsState, action: PayloadAction<BookingInfo>) => {
			if (state === null) {
				return
			}
			if (action.payload.date !== state.date) {
				return
			}
			state.bookings.push(action.payload)
			state.bookings.sort((a, b) =>
				a.timeRange.start.localeCompare(b.timeRange.start)
			)
		},

		updateBooking: (
			state: BookingsState,
			action: PayloadAction<BookingInfo>
		) => {
			if (state === null) {
				return
			}
			if (action.payload.date !== state.date) {
				return
			}
			const { id, ...updates } = action.payload
			const index = state.bookings.findIndex((booking) => booking.id === id)
			if (index !== -1) {
				state.bookings[index] = { ...state.bookings[index], ...updates }
				state.bookings.sort((a, b) =>
					a.timeRange.start.localeCompare(b.timeRange.start)
				)
			}
		},

		deleteBooking: (state: BookingsState, action: PayloadAction<string>) => {
			if (state === null) {
				return
			}
			const booking = state.bookings.find((item) => item.id === action.payload)
			if (booking === undefined || booking.date !== state.date) {
				return
			}
			state.bookings = state.bookings.filter(
				(booking) => booking.id !== action.payload
			)
		},
	},

	selectors: {
		selectDate: (state) => state?.date ?? getToday(),
		selectAllBookings: (state) => state?.bookings ?? null,
		selectAllBookingsExcept: (state, id: BookingInfo["id"]) =>
			state?.bookings.filter((booking) => booking.id !== id) ?? [],
		selectBookingById: (state, id: BookingInfo["id"]) =>
			state?.bookings.find((booking) => booking.id === id) ?? null,
	},
})

export const bookingsReducer = bookingsSlice.reducer
export const {
	selectAllBookings,
	selectAllBookingsExcept,
	selectDate,
	selectBookingById,
} = bookingsSlice.selectors
