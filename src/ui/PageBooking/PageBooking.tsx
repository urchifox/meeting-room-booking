import styles from "./PageBooking.module.css"

import { useEffect, useState } from "react"

import { getToday } from "../../domain/date"
import {
	addBooking,
	deleteBooking,
	loadBookings,
	selectAllBookings,
	selectDate,
	updateBooking,
} from "../../store/bookingsSlice"
import type { BookingInfo, YearMonthDay } from "../../types/types"
import { BookingForm } from "../BookingForm/BookingForm"
import { BookingsList } from "../BookingsList/BookingsList"
import { Button } from "../Button/Button"
import { Modal } from "../Modal/Modal"
import { useAppDispatch, useAppSelector } from "../hooks/store"

export function PageBooking() {
	const today = getToday()
	const dispatch = useAppDispatch()
	const date = useAppSelector(selectDate)
	const bookings = useAppSelector(selectAllBookings)
	const [isError, setError] = useState<boolean>(false)
	const [isModalFormOpen, setIsModalFormOpen] = useState(false)
	const [bookingInfo, setBookingInfo] = useState<BookingInfo | undefined>(
		undefined
	)
	const [errorMessage, setErrorMessage] = useState("")
	const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)

	const onAddClick = () => {
		setBookingInfo(undefined)
		setIsModalFormOpen(true)
	}

	const onEditClick = (booking: BookingInfo) => {
		setBookingInfo(booking)
		setIsModalFormOpen(true)
	}

	const showErrorMessage = (errors: Array<string>) => {
		setErrorMessage(errors.join("\n"))
		setIsErrorModalOpen(true)
	}

	const onSubmit = (booking: BookingInfo) => {
		const isNewBooking = bookingInfo === undefined
		const action = isNewBooking ? addBooking : updateBooking

		dispatch(action(booking))
			.unwrap()
			.then(() => setIsModalFormOpen(false))
			.catch((error) => showErrorMessage([error]))
	}

	const onDeleteClick = (id: string) => {
		dispatch(deleteBooking(id))
			.unwrap()
			.catch((error) => showErrorMessage([error]))
	}

	const onDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newDate = event.target.value ?? today
		dispatch(loadBookings({ date: newDate as YearMonthDay }))
			.unwrap()
			.catch(() => setError(true))
	}

	useEffect(() => {
		if (bookings !== null) {
			return
		}

		const request = dispatch(loadBookings({ date }))
		request.unwrap().catch((error: unknown) => {
			if (
				typeof error === "object" &&
				error !== null &&
				"name" in error &&
				error.name === "AbortError"
			) {
				return
			}

			setError(true)
		})

		return () => {
			request.abort()
		}
	}, [bookings, date, dispatch])

	return (
		<section className={styles.pageBooking}>
			<h1>Book a meeting room</h1>
			<Button onClick={onAddClick}>Add Booking</Button>
			<input
				type="date"
				id="bookings-list-date"
				name="date"
				min={today}
				value={date}
				onChange={onDateChange}
			/>
			{bookings === null && <p>Loading...</p>}
			{isError && <p>Error loading bookings</p>}
			{bookings !== null && (
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
