import dayjs, { Dayjs } from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"

import type {
	BookingInfo,
	HourMinute,
	TimeRange,
	ValidationResult,
	YearMonthDay,
} from "../types/types"
import { getDayjs } from "./date"
import {
	END_TIME,
	MAXIMUM_BOOKING_DURATION,
	MINIMUM_BOOKING_DURATION,
	START_TIME,
} from "./rules"

dayjs.extend(customParseFormat)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

export type DateTimeRange = {
	start: Dayjs
	end: Dayjs
}

function isPastDate({
	date,
	todayDate,
}: {
	date: YearMonthDay
	todayDate: Dayjs
}): boolean {
	return dayjs(date).isBefore(todayDate, "day")
}

function isPastTime({
	dateTime,
	todayDate,
}: {
	dateTime: Dayjs
	todayDate: Dayjs
}): boolean {
	return dayjs(dateTime).isBefore(todayDate)
}

function isTimeRangeValid({ start, end }: DateTimeRange): boolean {
	return dayjs(start).isBefore(end)
}

function isInWorkingDayTimeRange({
	date,
	dateTimeRange,
}: {
	date: YearMonthDay
	dateTimeRange: DateTimeRange
}): boolean {
	const { start, end } = dateTimeRange
	const workingDayStart = getDayjs({ date, time: START_TIME })
	const workingDayEnd = getDayjs({ date, time: END_TIME })

	return (
		dayjs(start).isSameOrAfter(workingDayStart) &&
		dayjs(end).isSameOrBefore(workingDayEnd)
	)
}

function isDurationValid({ start, end }: DateTimeRange): boolean {
	const duration = Math.abs(dayjs(end).diff(dayjs(start), "minutes"))
	return (
		duration >= MINIMUM_BOOKING_DURATION && duration <= MAXIMUM_BOOKING_DURATION
	)
}

function isTimeRangeOverlapping({
	dateTimeRange,
	otherBookings,
}: {
	dateTimeRange: DateTimeRange
	otherBookings: BookingInfo[]
}): boolean {
	const start = dateTimeRange.start
	const end = dateTimeRange.end

	return otherBookings.some((booking) => {
		const bookingStart = getDayjs({
			date: booking.date,
			time: booking.timeRange.start,
		})
		const bookingEnd = getDayjs({
			date: booking.date,
			time: booking.timeRange.end,
		})

		return start.isBefore(bookingEnd) && bookingStart.isBefore(end)
	})
}

export function isValidForBooking({
	today,
	currentTime,
	date,
	timeRange,
	otherBookings,
}: {
	today: YearMonthDay
	currentTime: HourMinute
	date: YearMonthDay
	timeRange: TimeRange
	otherBookings: BookingInfo[]
}): ValidationResult {
	const errors: string[] = []
	const dateTimeRange = {
		start: getDayjs({ date, time: timeRange.start }),
		end: getDayjs({ date, time: timeRange.end }),
	}
	const todayDate = getDayjs({ date: today, time: currentTime })

	if (isPastDate({ date, todayDate })) {
		errors.push(ValidationError.PAST_DATE)
	}

	if (isPastTime({ dateTime: dateTimeRange.start, todayDate })) {
		errors.push(ValidationError.PAST_TIME)
	}

	if (!isTimeRangeValid(dateTimeRange)) {
		errors.push(ValidationError.TIME_RANGE_INVALID)
	}

	if (!isInWorkingDayTimeRange({ date, dateTimeRange })) {
		errors.push(ValidationError.TIME_RANGE_NOT_IN_WORKING_DAY)
	}

	if (!isDurationValid(dateTimeRange)) {
		errors.push(ValidationError.DURATION_INVALID)
	}

	if (isTimeRangeOverlapping({ dateTimeRange, otherBookings })) {
		errors.push(ValidationError.TIME_RANGE_OVERLAPPING)
	}

	return errors.length > 0 ? { valid: false, errors } : { valid: true }
}

export enum ValidationError {
	PAST_DATE = "Date is in the past",
	PAST_TIME = "Time is in the past",
	TIME_RANGE_INVALID = "Time range is invalid, the start time must be before the end time",
	TIME_RANGE_NOT_IN_WORKING_DAY = "Time range is not in the working day, it should be between 09:00 and 18:00",
	DURATION_INVALID = "Duration is invalid, it should be between 30 minutes and 2 hours",
	TIME_RANGE_OVERLAPPING = "Time range is overlapping with other bookings",
}
