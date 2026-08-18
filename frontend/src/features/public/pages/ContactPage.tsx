import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  FileText,
  HeartHandshake,
  LockKeyhole,
  Mail,
  Send
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "../../auth/components/Alert.js";
import { Button } from "../../auth/components/Button.js";
import { TextField } from "../../auth/components/TextField.js";
import { FeatureCard, InfoList, SurfacePanel } from "../components/PublicCards.js";
import { PublicLayout } from "../components/PublicLayout.js";
import { PublicSeo } from "../components/PublicSeo.js";
import { SectionHeading } from "../components/SectionHeading.js";
import { usePlatformSettings } from "../../platform-settings/PlatformSettingsContext.js";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  subject: z.string().trim().min(3, "Enter a subject."),
  message: z.string().trim().min(10, "Enter at least 10 characters.")
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactPage(): JSX.Element {
  const { settings } = usePlatformSettings();
  const [deliveryNotice, setDeliveryNotice] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: ""
    }
  });

  return (
    <PublicLayout>
      <PublicSeo
        title="Contact | SME Feedback Aggregator"
        description="Contact SME Feedback Aggregator for product, support and customer feedback operations questions."
      />
      <main className="overflow-hidden">
        <section className="mx-auto grid w-full max-w-[1320px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <p className="inline-flex rounded-full bg-app-primary-soft px-3 py-1 text-xs font-black text-app-primary dark:text-indigo-100">
              We are here to help
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-app-text sm:text-5xl">
              Let us talk. We would love to hear from you.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-app-text-muted">
              Have a product question, need support, or want to discuss a clearer customer
              feedback operation? Start here and use the published support address when a
              direct reply is required.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-app-border bg-app-surface p-6 shadow-premium dark:bg-app-surface-muted/45">
            <div className="grid min-h-[280px] place-items-center rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-center text-white">
              <span className="inline-flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-white/15 text-white shadow-lg ring-1 ring-white/20">
                <Mail className="h-11 w-11" aria-hidden="true" />
              </span>
              <div>
                <h2 className="mt-6 text-2xl font-black text-white">
                  Product questions welcome
                </h2>
                <p className="mt-2 text-sm font-medium text-indigo-100">
                  Contact us at {settings.supportEmail}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1320px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.52fr] lg:px-8">
          <SurfacePanel>
            <h2 className="text-2xl font-black text-app-text">Send us a message</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
              Complete the form to validate your message, then use the support email for
              delivery while direct website submission is unavailable.
            </p>
            <form
              className="mt-7 space-y-5"
              onSubmit={handleSubmit(() => {
                setDeliveryNotice(
                  "Direct form delivery is not configured yet, so no message was sent."
                );
              })}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="name"
                  label="Your name"
                  placeholder="Enter your name"
                  autoComplete="name"
                  error={errors.name?.message}
                  size="comfortable"
                  {...register("name")}
                />
                <TextField
                  id="contact-email"
                  label="Email address"
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={errors.email?.message}
                  size="comfortable"
                  {...register("email")}
                />
              </div>
              <TextField
                id="subject"
                label="Subject"
                placeholder="How can we help?"
                error={errors.subject?.message}
                size="comfortable"
                {...register("subject")}
              />
              <div>
                <label
                  htmlFor="message"
                  className="block text-[13px] font-semibold text-app-text"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  rows={6}
                  placeholder="Tell us more about your question..."
                  className={`mt-2 block w-full resize-y rounded-md border bg-app-surface px-4 py-3 text-[15px] text-app-text outline-none transition placeholder:text-app-text-muted/70 focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 ${
                    errors.message ? "border-app-error" : "border-app-border"
                  }`}
                  aria-invalid={errors.message ? "true" : "false"}
                  aria-describedby={errors.message ? "message-error" : undefined}
                  {...register("message")}
                />
                {errors.message?.message ? (
                  <p
                    id="message-error"
                    className="mt-2 flex items-start gap-1.5 text-sm font-medium text-app-error"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {errors.message.message}
                  </p>
                ) : null}
              </div>

              {deliveryNotice ? <Alert variant="info">{deliveryNotice}</Alert> : null}

              <Button
                type="submit"
                icon={<Send className="h-4 w-4" aria-hidden="true" />}
                size="comfortable"
              >
                Check delivery status
              </Button>
            </form>
          </SurfacePanel>

          <SurfacePanel>
            <h2 className="text-2xl font-black text-app-text">Contact and support</h2>
            <div className="mt-6 space-y-5">
              {[
                {
                  icon: Mail,
                  title: "Email",
                  text: settings.supportPhone
                    ? `${settings.supportEmail} · ${settings.supportPhone}`
                    : settings.supportEmail
                },
                {
                  icon: LockKeyhole,
                  title: "Security",
                  text: "Report account, privacy or integration-security concerns through the published support address."
                },
                {
                  icon: FileText,
                  title: "Documentation",
                  text: "Product guidance is available throughout the public site and inside each workspace."
                }
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary dark:text-indigo-100">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-app-text">{title}</h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-app-text-muted">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </section>

        <section className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeading title="More ways we can help" />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: FileText,
                title: "Product questions",
                description:
                  "Ask about collection, inbox, workflow, reporting or integration capabilities."
              },
              {
                icon: HeartHandshake,
                title: "Feature requests",
                description:
                  "Share the customer moments and operating workflows your team wants to improve."
              },
              {
                icon: LockKeyhole,
                title: "Privacy questions",
                description:
                  "Review the legal pages or contact support with a data-handling question."
              }
            ].map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
          <SurfacePanel>
            <div className="grid gap-6 lg:grid-cols-[auto_1fr_0.9fr] lg:items-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg bg-app-primary-soft text-app-primary dark:text-indigo-100">
                <LockKeyhole className="h-8 w-8" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-2xl font-black text-app-text">
                  Your information is handled carefully
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
                  Because direct form delivery is not configured, submitted form values
                  are validated in the browser and are not sent to a backend endpoint.
                </p>
              </div>
              <InfoList
                items={[
                  "No fake success confirmation",
                  "No undocumented personal contact details",
                  "No backend contact feature added"
                ]}
              />
            </div>
          </SurfacePanel>
        </section>
      </main>
    </PublicLayout>
  );
}
