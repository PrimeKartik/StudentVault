import { useState, useEffect, useRef } from 'react'
import { Plus, X, Upload, FileText, Download, Trash2, Award } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Certificates() {
  const { user } = useAuth()
  const [certificates, setCertificates] = useState([])
  const [categories, setCategories] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef()

  const [formData, setFormData] = useState({
    title: '',
    issuer: '',
    issue_date: '',
    category_name: '',
    file: null
  })

  useEffect(() => {
    fetchData()
  }, [user])

  async function fetchData() {
    if (!user) return
    setLoading(true)
    
    // Fetch categories
    const { data: cats } = await supabase.from('category').select('*')
    setCategories(cats || [])

    // Fetch certificates
    const { data: certs } = await supabase.from('certificate').select('*').order('issue_date', { ascending: false })
    setCertificates(certs || [])
    
    setLoading(false)
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] })
  }

  const handleAddCertificate = async (e) => {
    e.preventDefault()
    if (!formData.file) return alert("Please select a file to upload")
    
    setUploading(true)

    try {
      // 1. Ensure category exists
      const catExists = categories.find(c => c.category_name.toLowerCase() === formData.category_name.toLowerCase())
      if (!catExists) {
        await supabase.from('category').insert({
          student_id: user.id,
          category_name: formData.category_name
        })
      }

      // 2. Upload file
      const fileExt = formData.file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `certificates/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('student-files')
        .upload(filePath, formData.file)

      if (uploadError) throw uploadError

      // 3. Insert certificate record
      const { error: dbError } = await supabase.from('certificate').insert({
        student_id: user.id,
        title: formData.title,
        issuer: formData.issuer,
        issue_date: formData.issue_date,
        category_name: formData.category_name,
        file_path: filePath
      })

      if (dbError) throw dbError

      // Reset & Refresh
      setFormData({ title: '', issuer: '', issue_date: '', category_name: '', file: null })
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      alert("Error adding certificate: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (cert) => {
    if (!window.confirm(`Are you sure you want to delete ${cert.title}?`)) return
    
    // Delete record
    await supabase.from('certificate').delete().eq('certificate_id', cert.certificate_id)
    
    // Delete file
    await supabase.storage.from('student-files').remove([cert.file_path])
    
    fetchData()
  }

  const handleDownload = async (filePath) => {
    const { data, error } = await supabase.storage.from('student-files').createSignedUrl(filePath, 60)
    if (error) alert("Error fetching file")
    else window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Certificates</h1>
          <p className="text-slate-400 mt-1">Manage and organize your achievements</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/30"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          <span>{showAddForm ? 'Cancel' : 'Add Certificate'}</span>
        </button>
      </header>

      {showAddForm && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-semibold mb-4 text-white">Add New Certificate</h2>
          <form onSubmit={handleAddCertificate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. AWS Cloud Practitioner" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Issuer</label>
                <input required type="text" name="issuer" value={formData.issuer} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Amazon Web Services" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Issue Date</label>
                <input required type="date" name="issue_date" value={formData.issue_date} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                <input required list="categories" type="text" name="category_name" value={formData.category_name} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Cloud Computing" />
                <datalist id="categories">
                  {categories.map(c => <option key={c.category_name} value={c.category_name} />)}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Certificate File (PDF, JPG, PNG)</label>
              <div className="flex items-center space-x-4">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors border border-slate-600"
                >
                  <Upload size={18} />
                  <span>Choose File</span>
                </button>
                <span className="text-slate-400 text-sm">
                  {formData.file ? formData.file.name : 'No file selected'}
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".pdf,.jpg,.jpeg,.png" 
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Save Certificate'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Certificates Grid */}
      {loading ? (
        <div className="text-slate-400">Loading certificates...</div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
          <Award size={48} className="mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No certificates found</h3>
          <p className="text-slate-400">Add your first certificate to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map(cert => (
            <div key={cert.certificate_id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
                    <FileText size={24} />
                  </div>
                  <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-medium">
                    {cert.category_name}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 truncate" title={cert.title}>{cert.title}</h3>
                <p className="text-sm text-slate-400 mb-4">{cert.issuer}</p>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-6">
                  Issued: {new Date(cert.issue_date).toLocaleDateString()}
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                  <button 
                    onClick={() => handleDownload(cert.file_path)}
                    className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
                  >
                    <Download size={16} />
                    <span>View / Download</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(cert)}
                    className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
