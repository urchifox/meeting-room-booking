import type {
	BookingInfo,
	HourMinute,
	TimeRange,
	ValidationResult,
	YearMonthDay,
} from "../types/types"
import { ValidationError, isValidForBooking } from "./validation"

export const bookings = [
	{
		id: "1",
		date: "2026-10-28",
		timeRange: { start: "11:00", end: "11:30" },
		title: "Meeting with John",
	},
	{
		id: "2",
		date: "2026-10-28",
		timeRange: { start: "12:00", end: "12:30" },
	},
	{
		id: "3",
		date: "2026-10-29",
		timeRange: { start: "13:00", end: "14:00" },
	},
] satisfies Array<BookingInfo>

const today = "2026-10-28" satisfies YearMonthDay
const currentTime = "09:20" satisfies HourMinute

type BookingValidationCase = {
	date: YearMonthDay
	timeRange: TimeRange
	expectedValidationResult: ValidationResult
}

function expectBookingValidation(name: string, cases: BookingValidationCase[]) {
	it.each(cases)(name, ({ date, timeRange, expectedValidationResult }) => {
		const otherBookings = bookings.filter((booking) => booking.date === date)

		const validationResult = isValidForBooking({
			today,
			currentTime,
			date,
			timeRange,
			otherBookings,
		})

		expect(validationResult).toEqual(expectedValidationResult)
	})
}

describe("validation", () => {
	expectBookingValidation(
		"consider booking on $date from $timeRange.start to $timeRange.end valid",
		[
			{
				date: "2026-10-28",
				timeRange: { start: "09:20", end: "10:00" },
				expectedValidationResult: { valid: true },
			},
			{
				date: "2026-10-29",
				timeRange: { start: "10:00", end: "11:00" },
				expectedValidationResult: { valid: true },
			},
			{
				date: "2026-10-30",
				timeRange: { start: "10:00", end: "10:30" },
				expectedValidationResult: { valid: true },
			},
			{
				date: "2026-10-30",
				timeRange: { start: "09:00", end: "09:30" },
				expectedValidationResult: { valid: true },
			},
			{
				date: "2026-10-30",
				timeRange: { start: "17:30", end: "18:00" },
				expectedValidationResult: { valid: true },
			},
			{
				date: "2026-10-30",
				timeRange: { start: "10:00", end: "12:00" },
				expectedValidationResult: { valid: true },
			},
			{
				date: "2026-10-28",
				timeRange: { start: "10:30", end: "11:00" },
				expectedValidationResult: { valid: true },
			},
			{
				date: "2026-10-28",
				timeRange: { start: "11:30", end: "12:00" },
				expectedValidationResult: { valid: true },
			},
		] satisfies Array<BookingValidationCase>
	)

	expectBookingValidation(
		"consider booking on $date from $timeRange.start to $timeRange.end invalid because of a past date",
		[
			{
				date: "2026-10-27",
				timeRange: { start: "15:00", end: "16:00" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.PAST_DATE, ValidationError.PAST_TIME],
				},
			},
		] satisfies Array<BookingValidationCase>
	)

	expectBookingValidation(
		"consider booking on $date from $timeRange.start to $timeRange.end invalid because of a past time",
		[
			{
				date: "2026-10-28",
				timeRange: { start: "09:00", end: "09:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.PAST_TIME],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "08:30", end: "09:00" },
				expectedValidationResult: {
					valid: false,
					errors: [
						ValidationError.PAST_TIME,
						ValidationError.TIME_RANGE_NOT_IN_WORKING_DAY,
					],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "09:00", end: "09:10" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.PAST_TIME, ValidationError.DURATION_INVALID],
				},
			},
		] satisfies Array<BookingValidationCase>
	)

	expectBookingValidation(
		"consider booking on $date from $timeRange.start to $timeRange.end invalid because of an invalid time range",
		[
			{
				date: "2026-10-28",
				timeRange: { start: "10:00", end: "09:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_INVALID],
				},
			},
			{
				date: "2026-10-30",
				timeRange: { start: "10:00", end: "10:00" },
				expectedValidationResult: {
					valid: false,
					errors: [
						ValidationError.TIME_RANGE_INVALID,
						ValidationError.DURATION_INVALID,
					],
				},
			},
		] satisfies Array<BookingValidationCase>
	)

	expectBookingValidation(
		"consider booking on $date from $timeRange.start to $timeRange.end invalid because of a time outside the working day",
		[
			{
				date: "2026-10-30",
				timeRange: { start: "08:00", end: "09:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_NOT_IN_WORKING_DAY],
				},
			},
			{
				date: "2026-10-30",
				timeRange: { start: "07:00", end: "07:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_NOT_IN_WORKING_DAY],
				},
			},
			{
				date: "2026-10-30",
				timeRange: { start: "08:00", end: "09:00" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_NOT_IN_WORKING_DAY],
				},
			},
			{
				date: "2026-10-30",
				timeRange: { start: "17:00", end: "18:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_NOT_IN_WORKING_DAY],
				},
			},
			{
				date: "2026-10-30",
				timeRange: { start: "18:00", end: "18:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_NOT_IN_WORKING_DAY],
				},
			},
			{
				date: "2026-10-30",
				timeRange: { start: "19:00", end: "19:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_NOT_IN_WORKING_DAY],
				},
			},
		] satisfies Array<BookingValidationCase>
	)

	expectBookingValidation(
		"consider booking on $date from $timeRange.start to $timeRange.end invalid because of wrong duration",
		[
			{
				date: "2026-10-28",
				timeRange: { start: "09:20", end: "09:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.DURATION_INVALID],
				},
			},
			{
				date: "2026-10-30",
				timeRange: { start: "09:20", end: "11:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.DURATION_INVALID],
				},
			},
			{
				date: "2026-10-30",
				timeRange: { start: "10:00", end: "10:29" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.DURATION_INVALID],
				},
			},
			{
				date: "2026-10-30",
				timeRange: { start: "10:00", end: "12:01" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.DURATION_INVALID],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "10:00", end: "12:30" },
				expectedValidationResult: {
					valid: false,
					errors: [
						ValidationError.DURATION_INVALID,
						ValidationError.TIME_RANGE_OVERLAPPING,
					],
				},
			},
		] satisfies Array<BookingValidationCase>
	)

	expectBookingValidation(
		"consider booking on $date from $timeRange.start to $timeRange.end invalid because of an overlapping time range",
		[
			{
				date: "2026-10-28",
				timeRange: { start: "10:00", end: "11:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "10:45", end: "11:15" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "10:45", end: "11:45" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "10:45", end: "12:45" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "11:00", end: "11:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "11:15", end: "11:45" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "11:45", end: "12:15" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-28",
				timeRange: { start: "11:45", end: "12:45" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-29",
				timeRange: { start: "13:00", end: "13:30" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-29",
				timeRange: { start: "13:15", end: "13:45" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
			{
				date: "2026-10-29",
				timeRange: { start: "13:30", end: "14:00" },
				expectedValidationResult: {
					valid: false,
					errors: [ValidationError.TIME_RANGE_OVERLAPPING],
				},
			},
		] satisfies Array<BookingValidationCase>
	)
})
