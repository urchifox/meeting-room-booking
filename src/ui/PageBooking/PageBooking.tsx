import styles from "./PageBooking.module.css"

import dayjs from "dayjs"
import { useEffect, useState } from "react"

import { getBookings } from "../../domain/bookings"
import type { BookingInfo } from "../../types/types"
import { BookingForm } from "../BookingForm/BookingForm"
import { BookingsList } from "../BookingsList/BookingsList"
import { Button } from "../Button/Button"
import { Modal } from "../Modal/Modal"

export function PageBooking() {
	const today = dayjs().format("YYYY-MM-DD")
	const [date, setDate] = useState<string>(today)
	const [bookings, setBookings] = useState<Array<BookingInfo> | null>(null)
	const [isError, setError] = useState<boolean>(false)
	const [isModalFormOpen, setIsModalFormOpen] = useState(false)
	const [bookingInfo, setBookingInfo] = useState<BookingInfo | undefined>(
		undefined
	)

	const onAddClick = () => {
		setBookingInfo(undefined)
		setIsModalFormOpen(true)
	}

	const onEditClick = (booking: BookingInfo) => {
		setBookingInfo(booking)
		setIsModalFormOpen(true)
	}

	const onSubmit = (booking: BookingInfo) => {
		setBookings((current) => {
			if (current === null) {
				return [booking]
			}

			const exists = current.some((item) => item.id === booking.id)
			if (!exists) {
				return [...current, booking]
			}

			return current.map((item) => (item.id === booking.id ? booking : item))
		})
		setIsModalFormOpen(false)
	}

	const onDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newDate = event.target.value ?? today
		setDate(newDate)
		setBookings(null)
	}

	useEffect(() => {
		if (bookings !== null) {
			return
		}

		let cancelled = false
		getBookings(date)
			.then((value) => {
				if (!cancelled) {
					setBookings(value)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setError(true)
				}
			})
		return () => {
			cancelled = true
		}
	}, [bookings, date])

	return (
		<section className={styles.pageBooking}>
			<h1>Book a meeting room</h1>
			<Button onClick={onAddClick}>Add Booking</Button>
			<input
				type="date"
				id="date"
				name="date"
				min={today}
				value={date}
				onChange={onDateChange}
			/>
			{bookings === null && <p>Loading...</p>}
			{isError && <p>Error loading bookings</p>}
			{bookings !== null && (
				<BookingsList bookings={bookings} onEditClick={onEditClick} />
			)}
			<Modal isOpen={isModalFormOpen} onClose={() => setIsModalFormOpen(false)}>
				<BookingForm bookingInfo={bookingInfo} onSubmit={onSubmit} />
			</Modal>
		</section>
	)
}
