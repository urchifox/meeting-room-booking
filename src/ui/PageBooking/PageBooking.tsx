import styles from "./PageBooking.module.css"

import { useEffect, useState } from "react"

import { getToday } from "../../domain/date"
import {
	BookingsStatus,
	activateDate,
	addBooking,
	deleteBooking,
	loadBookingsForDay,
	retryLoadBookingsForDay,
	selectActiveDate,
	selectBookingsByDay,
	selectIsMutationPending,
	updateBooking,
} from "../../store/bookings"
import type { BookingInfo, YearMonthDay } from "../../types/types"
import { BookingForm } from "../BookingForm/BookingForm"
import { BookingsList } from "../BookingsList/BookingsList"
import { Button } from "../Button/Button"
import { Modal } from "../Modal/Modal"
import { useAppDispatch, useAppSelector } from "../hooks/store"

export function PageBooking() {
	const today = getToday()
	const dispatch = useAppDispatch()
	const date = useAppSelector(selectActiveDate)
	const isMutationPending = useAppSelector(selectIsMutationPending)
	const bookings = useAppSelector((state) => selectBookingsByDay(state, date))
	const [isModalFormOpen, setIsModalFormOpen] = useState(false)
	const [bookingInfo, setBookingInfo] = useState<BookingInfo | undefined>(
		undefined
	)
	const [errorMessage, setErrorMessage] = useState("")
	const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)

	const onAddClick = () => {
		if (isMutationPending) {
			return
		}
		setBookingInfo(undefined)
		setIsModalFormOpen(true)
	}

	const onEditClick = (booking: BookingInfo) => {
		if (isMutationPending) {
			return
		}
		setBookingInfo(booking)
		setIsModalFormOpen(true)
	}

	const showErrorMessage = (error: unknown) => {
		let errorMessage = "Unknown error"
		if (Array.isArray(error)) {
			errorMessage = error.join("\n")
		} else if (typeof error === "string") {
			errorMessage = error
		} else if (
			typeof error === "object" &&
			error !== null &&
			"name" in error &&
			typeof error.name === "string"
		) {
			errorMessage = error.name
		}
		setErrorMessage(errorMessage)
		setIsErrorModalOpen(true)
	}

	const onSubmit = (booking: BookingInfo) => {
		if (isMutationPending) {
			return
		}
		const isNewBooking = bookingInfo === undefined
		const action = isNewBooking ? addBooking : updateBooking

		dispatch(action(booking))
			.unwrap()
			.then(() => setIsModalFormOpen(false))
			.catch(showErrorMessage)
	}

	const onDeleteClick = (id: string) => {
		if (isMutationPending) {
			return
		}
		dispatch(deleteBooking(id)).unwrap().catch(showErrorMessage)
	}

	const onDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newDate = event.target.value ?? today
		dispatch(activateDate(newDate as YearMonthDay))
	}

	const onRetryClick = () => {
		dispatch(retryLoadBookingsForDay(date)).unwrap().catch(showErrorMessage)
	}

	useEffect(() => {
		if (bookings !== null) {
			return
		}

		const request = dispatch(loadBookingsForDay(date))
		void request.unwrap().catch(() => {})

		return () => {
			request.abort()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [date, dispatch])

	return (
		<section className={styles.pageBooking}>
			<h1>Book a meeting room</h1>
			<Button onClick={onAddClick} disabled={isMutationPending}>
				Add Booking
			</Button>
			<input
				type="date"
				id="bookings-list-date"
				name="date"
				min={today}
				value={date}
				onChange={onDateChange}
			/>
			{(bookings === null || bookings === BookingsStatus.LOADING) && (
				<p>Loading...</p>
			)}
			{bookings === BookingsStatus.ERROR && (
				<>
					<p>Error loading bookings</p>
					<Button onClick={onRetryClick} disabled={isMutationPending}>
						Retry
					</Button>
				</>
			)}
			{Array.isArray(bookings) && (
				<BookingsList
					bookings={bookings}
					onDeleteClick={onDeleteClick}
					onEditClick={onEditClick}
				/>
			)}
			<Modal isOpen={isModalFormOpen} onClose={() => setIsModalFormOpen(false)}>
				<BookingForm bookingInfo={bookingInfo} onSubmit={onSubmit} />
			</Modal>
			<Modal
				isOpen={isErrorModalOpen}
				onClose={() => setIsErrorModalOpen(false)}
			>
				<p className={styles.errorMessage}>{errorMessage}</p>
			</Modal>
		</section>
	)
}
