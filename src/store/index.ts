import { configureStore } from "@reduxjs/toolkit"

import { bookingsReducer, reset } from "./bookingsSlice"

export const store = configureStore({
	reducer: {
		bookings: bookingsReducer,
	},
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppThunk<ReturnType = void> = (
	dispatch: AppDispatch,
	getState: () => RootState
) => ReturnType

export function resetStore() {
	store.dispatch(reset())
}
