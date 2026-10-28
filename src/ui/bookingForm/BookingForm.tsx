import styles from "./BookingForm.module.css"

import { type ChangeEvent, useState } from "react"

import type { BookingInfo, HourMinute, YearMonthDay } from "../../types/types"
import { Button } from "../Button/Button"

type BookingFormValues = {
	title: string
	date: "" | YearMonthDay
	start: "" | HourMinute
	end: "" | HourMinute
}

const defaultValues: BookingFormValues = {
	title: "",
	date: "",
	start: "",
	end: "",
}

function toFormValues(bookingInfo?: BookingInfo): BookingFormValues {
	return {
		title: bookingInfo?.title ?? defaultValues.title,
		date: bookingInfo?.date ?? defaultValues.date,
		start: bookingInfo?.timeRange.start ?? defaultValues.start,
		end: bookingInfo?.timeRange.end ?? defaultValues.end,
	}
}

function isFormField(name: string): name is keyof BookingFormValues {
	return Object.keys(defaultValues).includes(name)
}

export function BookingForm({
	bookingInfo,
	onSubmit,
}: {
	bookingInfo?: BookingInfo
	onSubmit: (booking: BookingInfo) => void
}) {
	const [values, setValues] = useState(() => toFormValues(bookingInfo))
	const [sourceBooking, setSourceBooking] = useState(bookingInfo)

	if (bookingInfo !== sourceBooking) {
		setSourceBooking(bookingInfo)
		setValues(toFormValues(bookingInfo))
	}

	const onChange = (event: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target
		if (!isFormField(name)) {
			return
		}

		setValues((current) => ({
			...current,
			[name]: value,
		}))
	}

	const submitBooking = () => {
		if (values.date === "" || values.start === "" || values.end === "") {
			return
		}

		onSubmit({
			id: bookingInfo?.id ?? crypto.randomUUID(),
			date: values.date,
			timeRange: {
				start: values.start,
				end: values.end,
			},
			title: values.title === "" ? undefined : values.title,
		})
	}

	return (
		<form
			className={styles.bookingForm}
			onSubmit={(event) => {
				event.preventDefault()
				submitBooking()
			}}
		>
			<h2>Add Booking</h2>
			<div className={styles.formGroup}>
				<label htmlFor="title">Title</label>
				<input
					type="text"
					id="title"
					name="title"
					value={values.title}
					onChange={onChange}
				/>
			</div>
			<div className={styles.formGroup}>
				<label htmlFor="date">Date</label>
				<input
					type="date"
					id="date"
					name="date"
					value={values.date}
					onChange={onChange}
				/>
			</div>
			<div className={styles.formGroup}>
				<label htmlFor="start">Start</label>
				<input
					type="time"
					id="start"
					name="start"
					value={values.start}
					onChange={onChange}
				/>
			</div>
			<div className={styles.formGroup}>
				<label htmlFor="end">End</label>
				<input
					type="time"
					id="end"
					name="end"
					value={values.end}
					onChange={onChange}
				/>
			</div>

			<Button onClick={submitBooking}>
				{bookingInfo ? "Update Booking" : "Add Booking"}
			</Button>
		</form>
	)
}
