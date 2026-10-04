import { useState, useEffect, useRef } from 'react'
import { Plus, X, Upload, FolderKanban, Download, Trash2, Code2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    file: null,
    technologies: [{ tech: '', role: '' }]
  })

  useEffect(() => {
    fetchData()
  }, [user])

  async function fetchData() {
    if (!user) return
    setLoading(true)
    
    // Fetch projects
    const { data: projs } = await supabase.from('project').select('*').order('start_date', { ascending: false })
    
    // For each project, fetch its USES and TECHNOLOGY
    const projectsWithTech = await Promise.all((projs || []).map(async (p) => {
      const { data: uses } = await supabase
        .from('uses')
        .select(`
          role,
          technology (
            technology_name
          )
        `)
        .eq('project_id', p.project_id)
        
      return { ...p, tech_uses: uses || [] }
    }))

    setProjects(projectsWithTech)
    setLoading(false)
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] })
  }

  const handleTechChange = (index, field, value) => {
    const newTechs = [...formData.technologies]
    newTechs[index][field] = value
    setFormData({ ...formData, technologies: newTechs })
  }

  const addTechField = () => {
    setFormData({ ...formData, technologies: [...formData.technologies, { tech: '', role: '' }] })
  }

  const removeTechField = (index) => {
    const newTechs = [...formData.technologies]
    newTechs.splice(index, 1)
    setFormData({ ...formData, technologies: newTechs })
  }

  const handleAddProject = async (e) => {
    e.preventDefault()
    if (!formData.file) return alert("Please select a file to upload")
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      return alert("End date cannot be before start date")
    }
    
    setUploading(true)

    try {
      // 1. Upload file
      const fileExt = formData.file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `projects/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('student-files')
        .upload(filePath, formData.file)

      if (uploadError) throw uploadError

      // 2. Insert PROJECT record
      const { data: projectData, error: dbError } = await supabase.from('project').insert({
        student_id: user.id,
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        file_path: filePath
      }).select().single()

      if (dbError) throw dbError

      // 3. Process Technologies
      for (const t of formData.technologies) {
        if (!t.tech || !t.role) continue;
        
        const techName = t.tech.trim()
        
        // Try to insert technology, ignore if exists
        const { data: existingTech } = await supabase.from('technology').select('technology_id').eq('technology_name', techName).single()
        
        let techId = existingTech?.technology_id

        if (!techId) {
          const { data: newTech, error: techError } = await supabase.from('technology').insert({
            technology_name: techName
          }).select().single()
          
          if (!techError && newTech) {
            techId = newTech.technology_id
          }
        }

        if (techId) {
          await supabase.from('uses').insert({
            project_id: projectData.project_id,
            technology_id: techId,
            role: t.role.trim()
          })
        }
      }

      // Reset & Refresh
      setFormData({ title: '', description: '', start_date: '', end_date: '', file: null, technologies: [{ tech: '', role: '' }] })
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      alert("Error adding project: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (proj) => {
    if (!window.confirm(`Are you sure you want to delete ${proj.title}?`)) return
    
    // Delete record (cascades to USES)
    await supabase.from('project').delete().eq('project_id', proj.project_id)
    
    // Delete file
    await supabase.storage.from('student-files').remove([proj.file_path])
    
    fetchData()
  }

  const handleDownload = async (filePath) => {
    const { data, error } = await supabase.storage.from('student-files').createSignedUrl(filePath, 60)
    if (error) alert("Error fetching file")
    else window.open(data.signedUrl, '_blank')
  }

  // Derived Attribute Calculation
  const calculateDuration = (start, end) => {
    const d1 = new Date(start)
    const d2 = new Date(end)
    const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
    if (months === 0) return "Less than a month"
    if (months === 1) return "1 month"
    return `${months} months`
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 mt-1">Showcase your practical experience</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/30"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          <span>{showAddForm ? 'Cancel' : 'Add Project'}</span>
        </button>
      </header>

      {showAddForm && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-semibold mb-4 text-white">Add New Project</h2>
          <form onSubmit={handleAddProject} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Project Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Student Vault System" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea rows="3" name="description" value={formData.description} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Brief overview of the project..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                <input required type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                <input required type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">Technologies Used</label>
                <button type="button" onClick={addTechField} className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center">
                  <Plus size={16} className="mr-1" /> Add Technology
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.technologies.map((t, index) => (
                  <div key={index} className="flex space-x-2">
                    <input 
                      required type="text" placeholder="Technology (e.g. React)"
                      value={t.tech} onChange={(e) => handleTechChange(index, 'tech', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                    />
                    <input 
                      required type="text" placeholder="Your Role (e.g. Frontend)"
                      value={t.role} onChange={(e) => handleTechChange(index, 'role', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                    />
                    {formData.technologies.length > 1 && (
                      <button type="button" onClick={() => removeTechField(index)} className="p-2 text-slate-500 hover:bg-slate-700 rounded-lg">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">Project File / Report (PDF)</label>
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
                  accept=".pdf,.zip,.jpg,.png" 
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                type="submit" 
                disabled={uploading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50"
              >
                {uploading ? 'Saving...' : 'Save Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      {loading ? (
        <div className="text-slate-400">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
          <FolderKanban size={48} className="mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
          <p className="text-slate-400">Add your first project to showcase your work.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map(proj => (
            <div key={proj.project_id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-white" title={proj.title}>{proj.title}</h3>
                  <span className="bg-indigo-500/10 text-indigo-400 text-xs px-3 py-1 rounded-full font-medium">
                    Duration: {calculateDuration(proj.start_date, proj.end_date)}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-4">{proj.description}</p>
                
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Code2 size={14} className="mr-1"/> Technologies & Roles</h4>
                  <div className="flex flex-wrap gap-2">
                    {proj.tech_uses.map((use, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
                        <span className="text-slate-200 font-medium">{use.technology.technology_name}</span>
                        <span className="text-slate-500 mx-1">•</span>
                        <span className="text-indigo-300">{use.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-700 mt-4">
                  <button 
                    onClick={() => handleDownload(proj.file_path)}
                    className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium"
                  >
                    <Download size={16} />
                    <span>View Project File</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(proj)}
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
