import { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Plus,
  Trash2,
  Save,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user } = useAuth()

  // Active navigation tab ('personal' | 'phones' | 'security')
  const [activeTab, setActiveTab] = useState('personal')

  // Loading states
  const [pageLoading, setPageLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [phoneAdding, setPhoneAdding] = useState(false)
  const [phoneDeleting, setPhoneDeleting] = useState(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Feedback notifications
  const [statusMessage, setStatusMessage] = useState(null) // { type: 'success' | 'error', text: string }

  // Student profile form data
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: ''
  })
  const [initialProfileData, setInitialProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: ''
  })

  // Phone numbers list
  const [phones, setPhones] = useState([])
  const [newPhone, setNewPhone] = useState('')

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Summary counts for header
  const [stats, setStats] = useState({
    certCount: 0,
    projCount: 0
  })

  // Copied student ID feedback
  const [copiedId, setCopiedId] = useState(false)

  // Predefined department suggestions
  const departmentSuggestions = [
    'Computer Science',
    'Information Technology',
    'Software Engineering',
    'Data Science & AI',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Business Administration'
  ]

  // Clear notification after 4 seconds
  const showFeedback = (type, text) => {
    setStatusMessage({ type, text })
    setTimeout(() => {
      setStatusMessage(null)
    }, 4500)
  }

  const [refreshIndex, setRefreshIndex] = useState(0)

  const handleRefresh = () => {
    setPageLoading(true)
    setRefreshIndex(prev => prev + 1)
  }

  // Fetch all profile details
  useEffect(() => {
    let ignore = false

    async function load() {
      if (!user) return
      try {
        // 1. Fetch student record
        const { data: studentRecord, error: studentError } = await supabase
          .from('student')
          .select('*')
          .eq('student_id', user.id)
          .maybeSingle()

        if (studentError && studentError.code !== 'PGRST116') {
          console.error('Error fetching student record:', studentError)
        }

        const fName = studentRecord?.first_name || user.user_metadata?.first_name || ''
        const lName = studentRecord?.last_name || user.user_metadata?.last_name || ''
        const email = studentRecord?.email || user.email || ''
        const dept = studentRecord?.department || ''

        const loadedProfile = {
          firstName: fName,
          lastName: lName,
          email: email,
          department: dept
        }

        // 2. Fetch student phone numbers
        const { data: phoneRecords, error: phoneError } = await supabase
          .from('student_phone')
          .select('phone')
          .eq('student_id', user.id)

        if (phoneError) {
          console.error('Error fetching phone numbers:', phoneError)
        }

        // 3. Fetch header counts
        const [certsRes, projsRes] = await Promise.all([
          supabase.from('certificate').select('*', { count: 'exact', head: true }),
          supabase.from('project').select('*', { count: 'exact', head: true })
        ])

        if (!ignore) {
          setProfileData(loadedProfile)
          setInitialProfileData(loadedProfile)
          setPhones(phoneRecords ? phoneRecords.map(p => p.phone) : [])
          setStats({
            certCount: certsRes.count || 0,
            projCount: projsRes.count || 0
          })
          setPageLoading(false)
        }
      } catch (err) {
        if (!ignore) {
          console.error('Unexpected error loading profile:', err)
          showFeedback('error', 'Failed to load some profile details.')
          setPageLoading(false)
        }
      }
    }

    load()

    return () => {
      ignore = true
    }
  }, [user, refreshIndex])

  // Handle profile form input change
  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({ ...prev, [name]: value }))
  }

  // Quick select department suggestion
  const handleSelectDepartment = (dept) => {
    setProfileData(prev => ({ ...prev, department: dept }))
  }

  // Save profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      showFeedback('error', 'First name and last name are required.')
      return
    }

    setProfileSaving(true)
    try {
      // Upsert into STUDENT table
      const { error: upsertError } = await supabase.from('student').upsert({
        student_id: user.id,
        first_name: profileData.firstName.trim(),
        last_name: profileData.lastName.trim(),
        email: user.email,
        department: profileData.department.trim()
      })

      if (upsertError) {
        throw upsertError
      }

      // Also update auth user metadata
      await supabase.auth.updateUser({
        data: {
          first_name: profileData.firstName.trim(),
          last_name: profileData.lastName.trim(),
          department: profileData.department.trim()
        }
      })

      setInitialProfileData(profileData)
      showFeedback('success', 'Profile information updated successfully!')
    } catch (err) {
      console.error('Error saving profile:', err)
      showFeedback('error', err.message || 'Failed to update profile information.')
    } finally {
      setProfileSaving(false)
    }
  }

  // Check if profile form is modified
  const isProfileModified =
    profileData.firstName !== initialProfileData.firstName ||
    profileData.lastName !== initialProfileData.lastName ||
    profileData.department !== initialProfileData.department

  // Copy Student ID to clipboard
  const handleCopyId = () => {
    if (!user?.id) return
    navigator.clipboard.writeText(user.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  // Add Phone Number
  const handleAddPhone = async (e) => {
    e.preventDefault()
    const cleanPhone = newPhone.trim()

    if (!cleanPhone) {
      showFeedback('error', 'Please enter a valid phone number.')
      return
    }

    if (phones.includes(cleanPhone)) {
      showFeedback('error', 'This phone number is already added.')
      return
    }

    setPhoneAdding(true)
    try {
      const { error } = await supabase.from('student_phone').insert({
        student_id: user.id,
        phone: cleanPhone
      })

      if (error) {
        throw error
      }

      setPhones(prev => [...prev, cleanPhone])
      setNewPhone('')
      showFeedback('success', 'Phone number registered successfully!')
    } catch (err) {
      console.error('Error adding phone number:', err)
      showFeedback('error', err.message || 'Failed to add phone number.')
    } finally {
      setPhoneAdding(false)
    }
  }

  // Delete Phone Number
  const handleDeletePhone = async (phoneToDelete) => {
    setPhoneDeleting(phoneToDelete)
    try {
      const { error } = await supabase
        .from('student_phone')
        .delete()
        .eq('student_id', user.id)
        .eq('phone', phoneToDelete)

      if (error) {
        throw error
      }

      setPhones(prev => prev.filter(p => p !== phoneToDelete))
      showFeedback('success', 'Phone number removed.')
    } catch (err) {
      console.error('Error deleting phone number:', err)
      showFeedback('error', err.message || 'Failed to remove phone number.')
    } finally {
      setPhoneDeleting(null)
    }
  }

  // Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword.length < 6) {
      showFeedback('error', 'New password must be at least 6 characters long.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback('error', 'New passwords do not match.')
      return
    }

    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) {
        throw error
      }

      setPasswordForm({ newPassword: '', confirmPassword: '' })
      showFeedback('success', 'Password updated successfully!')
    } catch (err) {
      console.error('Error updating password:', err)
      showFeedback('error', err.message || 'Failed to update password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  // Format initials
  const initials = (
    (profileData.firstName?.[0] || user?.email?.[0] || 'S') +
    (profileData.lastName?.[0] || '')
  ).toUpperCase()

  // Format account creation date
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Recent'

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Student Profile</h1>
          <p className="text-slate-400 mt-1">Manage your account credentials, contacts, and security</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={pageLoading}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors text-sm font-medium self-start sm:self-auto disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={16} className={pageLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Floating Status Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 transition-all animate-in fade-in slide-in-from-top-2 border shadow-lg ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check size={20} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-red-400 shrink-0" />
          )}
          <p className="text-sm font-medium flex-1">{statusMessage.text}</p>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800/50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Profile Overview Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800/90 to-blue-950/40 rounded-2xl border border-slate-700 shadow-xl p-6 sm:p-8">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg shadow-blue-500/25 ring-4 ring-slate-800">
                {initials}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-slate-800 rounded-full flex items-center justify-center text-white"
                title="Active Account"
              >
                <Check size={12} strokeWidth={3} />
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {profileData.firstName || profileData.lastName
                    ? `${profileData.firstName} ${profileData.lastName}`.trim()
                    : 'Student User'}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <ShieldCheck size={12} className="mr-1" />
                  Verified Student
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-slate-300">
                <div className="flex items-center text-slate-400">
                  <Mail size={15} className="mr-1.5 text-slate-400" />
                  <span>{user?.email}</span>
                </div>
                {profileData.department && (
                  <div className="flex items-center text-blue-300 font-medium">
                    <GraduationCap size={16} className="mr-1.5 text-blue-400" />
                    <span>{profileData.department}</span>
                  </div>
                )}
                <div className="flex items-center text-slate-400">
                  <Calendar size={15} className="mr-1.5 text-slate-400" />
                  <span>Joined {memberSince}</span>
                </div>
              </div>

              {/* Student UUID copy pill */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">ID:</span>
                <code className="text-xs text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700 font-mono">
                  {user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-6)}` : 'N/A'}
                </code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
                  title="Copy full UUID"
                >
                  {copiedId ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Pill Group */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4 shrink-0 bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-700/60">
            <div className="text-center px-3">
              <span className="block text-xl sm:text-2xl font-bold text-white">{stats.certCount}</span>
              <span className="text-xs text-slate-400 font-medium">Certificates</span>
            </div>
            <div className="w-px h-8 bg-slate-700/80 hidden sm:block" />
            <div className="text-center px-3">
              <span className="block text-xl sm:text-2xl font-bold text-white">{stats.projCount}</span>
              <span className="text-xs text-slate-400 font-medium">Projects</span>
            </div>
            <div className="w-px h-8 bg-slate-700/80 hidden sm:block" />
            <div className="text-center px-3 col-span-2 sm:col-span-1">
              <span className="block text-xl sm:text-2xl font-bold text-indigo-400">{phones.length}</span>
              <span className="text-xs text-slate-400 font-medium">Phones</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-700 flex space-x-2 sm:space-x-8 overflow-x-auto pb-1 text-sm font-medium">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center space-x-2 pb-3 px-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'personal'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User size={18} />
          <span>Personal Info</span>
        </button>

        <button
          onClick={() => setActiveTab('phones')}
          className={`flex items-center space-x-2 pb-3 px-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'phones'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Phone size={18} />
          <span>Phone Numbers</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
            {phones.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center space-x-2 pb-3 px-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={18} />
          <span>Security & Password</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. PERSONAL INFORMATION TAB */}
      {activeTab === 'personal' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 sm:p-7 border border-slate-700 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User size={20} className="text-blue-400" />
                Student Details
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Keep your academic profile and personal names updated.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    placeholder="e.g. John"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    placeholder="e.g. Doe"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Department / Major
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <GraduationCap size={18} />
                  </div>
                  <input
                    type="text"
                    name="department"
                    value={profileData.department}
                    onChange={handleProfileChange}
                    placeholder="e.g. Computer Science"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>

                {/* Suggestion tags */}
                <div className="mt-3">
                  <span className="text-xs text-slate-400 block mb-1.5">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {departmentSuggestions.map(dept => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => handleSelectDepartment(dept)}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors border cursor-pointer ${
                          profileData.department === dept
                            ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border-slate-700'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={profileData.email}
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg pl-10 pr-10 py-2.5 text-slate-400 cursor-not-allowed select-none"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">
                    <Lock size={16} />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <span>Email is managed through Supabase Authentication.</span>
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-700">
                <span className="text-xs text-slate-400">
                  {isProfileModified ? (
                    <span className="text-amber-400 font-medium">Unsaved changes pending</span>
                  ) : (
                    'All details up to date'
                  )}
                </span>
                <button
                  type="submit"
                  disabled={profileSaving || !isProfileModified}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Save size={18} />
                  <span>{profileSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PHONE NUMBERS TAB */}
      {activeTab === 'phones' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 sm:p-7 border border-slate-700 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Phone size={20} className="text-indigo-400" />
                  Registered Phone Numbers
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Store primary and emergency contact numbers linked to your student record.
                </p>
              </div>
            </div>

            {/* Add Phone Form */}
            <form onSubmit={handleAddPhone} className="mb-6 p-4 bg-slate-900/80 rounded-xl border border-slate-700/80">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Add New Contact Number
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000 or 9876543210"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={phoneAdding || !newPhone.trim()}
                  className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Plus size={18} />
                  <span>{phoneAdding ? 'Adding...' : 'Add Phone'}</span>
                </button>
              </div>
            </form>

            {/* Phone List */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Current Numbers ({phones.length})
              </h4>

              {phones.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-dashed border-slate-700 p-6">
                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Phone size={24} />
                  </div>
                  <h5 className="text-base font-semibold text-slate-300">No Phone Numbers Added</h5>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                    Add a phone number above so academic mentors and university faculty can reach you.
                  </p>
                </div>
              ) : (
                phones.map((phone, index) => (
                  <div
                    key={phone}
                    className="flex items-center justify-between p-4 bg-slate-900/90 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        <Phone size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white tracking-wide">{phone}</span>
                          {index === 0 && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Primary
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          Registered Contact #{index + 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(phone)
                          showFeedback('success', `Copied ${phone} to clipboard!`)
                        }}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Copy number"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhone(phone)}
                        disabled={phoneDeleting === phone}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        title="Delete number"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SECURITY & PASSWORD TAB */}
      {activeTab === 'security' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 sm:p-7 border border-slate-700 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound size={20} className="text-blue-400" />
                Change Password
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Update your authentication credentials to keep your account secure.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={
                    passwordSaving ||
                    !passwordForm.newPassword ||
                    passwordForm.newPassword !== passwordForm.confirmPassword
                  }
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <KeyRound size={18} />
                  <span>{passwordSaving ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
