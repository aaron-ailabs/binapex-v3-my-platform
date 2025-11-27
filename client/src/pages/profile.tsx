import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import Dropzone from 'react-dropzone'
import AvatarEditor from 'react-avatar-editor'

export default function ProfilePage() {
  const { user, token } = useAuth()
  const { toast } = useToast()
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api'
  const [initial, setInitial] = useState<any>({ name: '', email: '', phone: '', address: '', secondary: '' })
  const [roleInfo, setRoleInfo] = useState<any>({})
  const [image, setImage] = useState<File | null>(null)
  const editorRef = useRef<AvatarEditor | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch(`${apiBase}/profile`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (r.ok) {
          const d = await r.json()
          setInitial({ name: d.name || user?.name || '', email: d.email || user?.email || '', phone: d.phone || '', address: d.address || '', secondary: d.secondary || '' })
          setRoleInfo(d.preferences || {})
        }
      } catch {}
    })()
  }, [apiBase, token, user])

  const Schema = Yup.object({
    name: Yup.string().min(2).max(120).required(),
    email: Yup.string().email().required(),
    phone: Yup.string().min(5).max(32).required(),
    address: Yup.string().max(240),
    secondary: Yup.string().max(240)
  })

  const saveAvatar = async () => {
    if (!editorRef.current) return
    const canvas = editorRef.current.getImageScaledToCanvas()
    const dataUrl = canvas.toDataURL('image/png')
    try {
      const r = await fetch(`${apiBase}/profile/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ dataUrl })
      })
      if (r.ok) toast({ title: 'Profile Picture Updated' })
      else toast({ variant: 'destructive', title: 'Upload Failed' })
    } catch { toast({ variant: 'destructive', title: 'Upload Error' }) }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your contact details and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <Formik initialValues={initial} enableReinitialize validationSchema={Schema} onSubmit={async (vals, { setSubmitting }) => {
            try {
              const r = await fetch(`${apiBase}/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ name: vals.name, phone: vals.phone, preferences: roleInfo }) })
              if (r.ok) toast({ title: 'Profile Saved' })
              else toast({ variant: 'destructive', title: 'Save Failed' })
            } catch { toast({ variant: 'destructive', title: 'Network Error' }) }
            setSubmitting(false)
          }}>
            {({ errors: _errors, touched: _touched }) => (
              <Form className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Field as={Input} name="name" className="h-12" aria-label="Full Name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Field as={Input} name="email" disabled className="h-12" aria-label="Email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Field as={Input} name="phone" className="h-12" aria-label="Phone" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Field as={Input} name="address" className="h-12" aria-label="Address" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Secondary Contact</Label>
                  <Field as={Input} name="secondary" className="h-12" aria-label="Secondary Contact" />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <Button type="submit" className="btn touch-target">Save</Button>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dropzone accept={{ 'image/*': [] }} maxFiles={1} maxSize={2_000_000} onDrop={(files) => setImage(files[0] || null)}>
            {({ getRootProps }) => (
              <div {...getRootProps()} className="border rounded-md p-4 text-sm cursor-pointer">Upload Image (Max 2MB)</div>
            )}
          </Dropzone>
          {image && (
            <div className="flex items-center gap-4">
              <AvatarEditor ref={editorRef as any} image={image} width={200} height={200} border={8} borderRadius={100} scale={1.2} />
              <Button onClick={saveAvatar} className="btn touch-target">Save</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Security and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Notifications</Label>
            <Select value={String(roleInfo.notifications || 'enabled')} onValueChange={(v) => setRoleInfo({ ...roleInfo, notifications: v })}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="muted">Muted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={String(roleInfo.lang || 'en')} onValueChange={(v) => setRoleInfo({ ...roleInfo, lang: v })}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ms">Malay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password Change</CardTitle>
          <CardDescription>Secure update with verification</CardDescription>
        </CardHeader>
        <CardContent>
          <Formik initialValues={{ password: '', confirmPassword: '', channel: 'email', code: '' }} onSubmit={async (vals, { setSubmitting, resetForm }) => {
            try {
              const req = await fetch(`${apiBase}/security/request-verification`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ channel: vals.channel }) })
              if (!req.ok) throw new Error('Verification failed')
              const resp = await req.json()
              const code = String(resp.devCode || vals.code || '')
              const r = await fetch(`${apiBase}/security/withdrawal-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ password: vals.password, confirmPassword: vals.confirmPassword, code, channel: vals.channel }) })
              if (r.ok) { toast({ title: 'Password Updated' }); resetForm() } else { toast({ variant: 'destructive', title: 'Update Failed' }) }
            } catch { toast({ variant: 'destructive', title: 'Error' }) }
            setSubmitting(false)
          }}>
            {() => (
              <Form className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Field as={Input} name="password" type="password" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Field as={Input} name="confirmPassword" type="password" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Field as={Select} name="channel">
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Field>
                </div>
                <div className="space-y-2">
                  <Label>Verification Code (optional)</Label>
                  <Field as={Input} name="code" className="h-12" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="btn touch-target">Change Password</Button>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>

    </div>
  )
}
