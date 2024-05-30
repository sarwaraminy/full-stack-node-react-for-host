-- Table: public.room

-- DROP TABLE IF EXISTS public.room;

CREATE TABLE IF NOT EXISTS public.room
(
    room_id integer NOT NULL DEFAULT nextval('room_room_id_seq'::regclass),
    name character varying(16) COLLATE pg_catalog."default" NOT NULL,
    room_number character(2) COLLATE pg_catalog."default" NOT NULL,
    bed_info character(2) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT room_pkey PRIMARY KEY (room_id),
    CONSTRAINT room_room_number_key UNIQUE (room_number)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.room
    OWNER to postgres;

-- Table: public.guest

-- DROP TABLE IF EXISTS public.guest;

CREATE TABLE IF NOT EXISTS public.guest
(
    guest_id integer NOT NULL DEFAULT nextval('guest_guest_id_seq'::regclass),
    first_name character varying(64) COLLATE pg_catalog."default",
    last_name character varying(64) COLLATE pg_catalog."default",
    email_address character varying(64) COLLATE pg_catalog."default",
    address character varying(64) COLLATE pg_catalog."default",
    country character varying(32) COLLATE pg_catalog."default",
    state character varying(12) COLLATE pg_catalog."default",
    phone_number character varying(24) COLLATE pg_catalog."default",
    CONSTRAINT guest_pkey PRIMARY KEY (guest_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.guest
    OWNER to postgres;

-- Table: public.reservation

-- DROP TABLE IF EXISTS public.reservation;

CREATE TABLE IF NOT EXISTS public.reservation
(
    reservation_id integer NOT NULL DEFAULT nextval('reservation_reservation_id_seq'::regclass),
    room_id bigint NOT NULL,
    guest_id bigint NOT NULL,
    res_date date,
    CONSTRAINT reservation_pkey PRIMARY KEY (reservation_id),
    CONSTRAINT reservation_guest_id_fkey FOREIGN KEY (guest_id)
        REFERENCES public.guest (guest_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT reservation_room_id_fkey FOREIGN KEY (room_id)
        REFERENCES public.room (room_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.reservation
    OWNER to postgres;
-- Index: idx_res_date_

-- DROP INDEX IF EXISTS public.idx_res_date_;

CREATE INDEX IF NOT EXISTS idx_res_date_
    ON public.reservation USING btree
    (res_date ASC NULLS LAST)
    TABLESPACE pg_default;
	
	
-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    email character varying(100) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    first_name character varying(50) COLLATE pg_catalog."default",
    last_name character varying(50) COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to postgres;

-- Trigger: update_users_updated_at

-- DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE 
    ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

