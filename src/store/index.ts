import { combineReducers, configureStore } from "@reduxjs/toolkit"
import {
	FLUSH,
	PAUSE,
	PERSIST,
	PURGE,
	REGISTER,
	REHYDRATE,
	persistReducer,
	persistStore,
} from "redux-persist"
import storage from "redux-persist/es/storage"

import { bookingsReducer } from "./bookingsSlice"

const persistConfig = {
	key: "root",
	storage,
}

const rootReducer = combineReducers({
	bookings: bookingsReducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
			},
		}),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppThunk<ReturnType = void> = (
	dispatch: AppDispatch,
	getState: () => RootState
) => ReturnType
