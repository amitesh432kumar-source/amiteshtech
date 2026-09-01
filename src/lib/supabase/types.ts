/**
 * Mirrors supabase/migrations. Regenerate against the live project with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 */

export type UserRole = "student" | "admin";
export type CourseStatus = "draft" | "published" | "archived";
export type WebinarStatus = "draft" | "published" | "live" | "completed" | "cancelled";
export type LessonContentType = "video" | "text";
export type ProductType = "course" | "webinar";
export type PaymentMethod = "paypal" | "upi";
export type PaymentStatus =
  | "pending"
  | "pending_verification"
  | "paid"
  | "failed"
  | "rejected"
  | "refunded";
export type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";
export type EnrollmentStatus = "active" | "completed" | "cancelled";
export type RegistrationStatus = "registered" | "attended" | "cancelled";
export type DiscountType = "percentage" | "fixed";

export type FaqItem = { question: string; answer: string };

export type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  suspended: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  rating: number;
  avatar_url: string | null;
  published: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type StudentRegistration = {
  id: string;
  seq_no: number;
  full_name: string;
  email: string;
  mobile_number: string;
  country: string;
  state: string;
  city: string;
  created_at: string;
};

export type Course = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  currency: string;
  instructor: string | null;
  instructor_bio: string | null;
  category_id: string | null;
  level: string | null;
  status: CourseStatus;
  duration_minutes: number | null;
  learning_outcomes: string[];
  requirements: string[];
  faq: FaqItem[];
  show_enroll_count: boolean;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  content_type: LessonContentType;
  video_url: string | null;
  content: string | null;
  position: number;
  duration: number | null;
  is_preview: boolean;
  created_at: string;
};

export type LessonResource = {
  id: string;
  lesson_id: string;
  title: string;
  file_url: string;
  created_at: string;
};

export type Webinar = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  instructor: string | null;
  instructor_bio: string | null;
  start_at: string;
  duration: number;
  price: number;
  currency: string;
  seat_limit: number | null;
  seats_taken: number;
  status: WebinarStatus;
  meeting_url: string | null;
  learning_outcomes: string[];
  requirements: string[];
  audience: string[];
  faq: FaqItem[];
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  product_type: ProductType;
  course_id: string | null;
  webinar_id: string | null;
  coupon_id: string | null;
  subtotal: number;
  discount: number;
  amount: number;
  currency: string;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  user_id: string;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  paypal_order_id: string | null;
  paypal_transaction_id: string | null;
  upi_id: string | null;
  utr_number: string | null;
  screenshot_url: string | null;
  payer_name: string | null;
  payer_email: string | null;
  status: PaymentStatus;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  order_id: string | null;
  status: EnrollmentStatus;
  enrolled_at: string;
};

export type WebinarRegistration = {
  id: string;
  webinar_id: string;
  user_id: string;
  order_id: string | null;
  status: RegistrationStatus;
  registered_at: string;
};

export type LessonProgress = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
};

export type Certificate = {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
};

export type SiteSetting = {
  id: string;
  key: string;
  value: unknown;
  is_public: boolean;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  handled: boolean;
  created_at: string;
};

export type AdminAuditLog = {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  detail: unknown;
  created_at: string;
};

export type AdminOverview = {
  users: number;
  courses: number;
  published_courses: number;
  webinars: number;
  enrollments: number;
  registrations: number;
  orders: number;
  paid_orders: number;
  pending_upi: number;
  revenue: number;
};

type Relationship<
  Column extends string,
  Relation extends string,
  FkName extends string = string,
> = {
  foreignKeyName: FkName;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Relation;
  referencedColumns: ["id"];
};

type Table<Row, Rel extends readonly unknown[] = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: Rel;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      categories: Table<Category>;
      courses: Table<Course, [Relationship<"category_id", "categories">]>;
      course_modules: Table<CourseModule, [Relationship<"course_id", "courses">]>;
      lessons: Table<Lesson, [Relationship<"module_id", "course_modules">]>;
      lesson_resources: Table<LessonResource, [Relationship<"lesson_id", "lessons">]>;
      webinars: Table<Webinar>;
      coupons: Table<Coupon>;
      orders: Table<
        Order,
        [
          Relationship<"user_id", "profiles">,
          Relationship<"course_id", "courses">,
          Relationship<"webinar_id", "webinars">,
          Relationship<"coupon_id", "coupons">,
        ]
      >;
      payments: Table<
        Payment,
        [
          Relationship<"order_id", "orders", "payments_order_id_fkey">,
          Relationship<"user_id", "profiles", "payments_user_id_fkey">,
          Relationship<"verified_by", "profiles", "payments_verified_by_fkey">,
        ]
      >;
      enrollments: Table<
        Enrollment,
        [
          Relationship<"user_id", "profiles">,
          Relationship<"course_id", "courses">,
          Relationship<"order_id", "orders">,
        ]
      >;
      webinar_registrations: Table<
        WebinarRegistration,
        [
          Relationship<"webinar_id", "webinars">,
          Relationship<"user_id", "profiles">,
          Relationship<"order_id", "orders">,
        ]
      >;
      lesson_progress: Table<
        LessonProgress,
        [Relationship<"user_id", "profiles">, Relationship<"lesson_id", "lessons">]
      >;
      certificates: Table<
        Certificate,
        [Relationship<"user_id", "profiles">, Relationship<"course_id", "courses">]
      >;
      testimonials: Table<Testimonial>;
      student_registrations: Table<StudentRegistration>;
      site_settings: Table<SiteSetting>;
      notifications: Table<Notification>;
      contact_messages: Table<ContactMessage>;
      admin_audit_log: Table<AdminAuditLog>;
    };
    Views: {
      course_stats: {
        Row: {
          course_id: string;
          lesson_count: number;
          total_duration: number;
          enrollment_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_overview: { Args: Record<string, never>; Returns: AdminOverview };
      enrol_in_free_course: { Args: { p_course_id: string }; Returns: Enrollment };
      register_for_free_webinar: { Args: { p_webinar_id: string }; Returns: WebinarRegistration };
      register_for_webinar: {
        Args: { p_webinar_id: string; p_user_id: string; p_order_id?: string | null };
        Returns: WebinarRegistration;
      };
      cancel_webinar_registration: {
        Args: { p_webinar_id: string; p_user_id: string };
        Returns: undefined;
      };
      fulfil_order: { Args: { p_order_id: string }; Returns: undefined };
      course_progress: { Args: { p_user_id: string; p_course_id: string }; Returns: number };
      create_order: {
        Args: {
          p_product_type: ProductType;
          p_product_id: string;
          p_coupon_code?: string | null;
          p_payment_method?: PaymentMethod | null;
        };
        Returns: Order;
      };
      submit_upi_payment: {
        Args: {
          p_order_id: string;
          p_utr: string;
          p_payer_name: string;
          p_payer_email: string;
          p_upi_id?: string | null;
          p_screenshot_url?: string | null;
        };
        Returns: Payment;
      };
      review_upi_payment: {
        Args: { p_payment_id: string; p_approve: boolean; p_reason?: string | null };
        Returns: undefined;
      };
      validate_coupon: {
        Args: { p_code: string };
        Returns: {
          id: string;
          code: string;
          discount_type: DiscountType;
          discount_value: number;
          expires_at: string | null;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      course_status: CourseStatus;
      webinar_status: WebinarStatus;
      lesson_content_type: LessonContentType;
      product_type: ProductType;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      order_status: OrderStatus;
      enrollment_status: EnrollmentStatus;
      registration_status: RegistrationStatus;
      discount_type: DiscountType;
    };
    CompositeTypes: Record<string, never>;
  };
};
