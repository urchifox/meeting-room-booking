export type BookingInfo = {
	id: string
	/** YYYY-MM-DD */
	date: string
	/** HH:mm */
	start: string
	/** HH:mm */
	end: string
	title?: string
}
