import {
	type PayloadAction,
	createAsyncThunk,
	createSlice,
} from "@reduxjs/toolkit"

import { getBookings } from "../domain/bookings"
import { getToday } from "../domain/date"
import type { BookingInfo, YearMonthDay } from "../types/types"

type BookingsState = {
	date: YearMonthDay
	bookings: Array<BookingInfo>
} | null

const initialState = null as BookingsState

export const loadBookings = createAsyncThunk<
	Array<BookingInfo>,
	{ date: YearMonthDay },
	{ rejectValue: string }
>("bookings/loadBookings", async (action, { rejectWithValue }) => {
	try {
		const bookings = await getBookings(action.date)
		return bookings.sort((a, b) =>
			a.timeRange.start.localeCompare(b.timeRange.start)
		)
	} catch (_) {
		return rejectWithValue("Failed to load bookings")
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

	extraReducers: (builder) => {
		builder.addCase(loadBookings.fulfilled, (_, action) => {
			return { date: action.meta.arg.date, bookings: action.payload }
		})
	},

	selectors: {
		selectDate: (state) => state?.date ?? getToday(),
		selectAllBookings: (state) => state?.bookings ?? [],

		selectBookingById: (state, id: BookingInfo["id"]) =>
			state?.bookings.find((booking) => booking.id === id) ?? null,
	},
})

export const bookingsReducer = bookingsSlice.reducer
export const { setBookings, addBooking, updateBooking, deleteBooking } =
	bookingsSlice.actions
export const { selectAllBookings, selectDate, selectBookingById } =
	bookingsSlice.selectors
