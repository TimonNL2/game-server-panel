import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

function FileManager() {
  const { id } = useParams();
  const [currentPath, setCurrentPath] = useState('.');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/servers/${id}/files`, {
        params: { path: currentPath }
      });
      
      if (response.data.type === 'directory') {
        setFiles(response.data.items);
        setSelectedFile(null);
        setFileContent('');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const navigateToPath = (newPath) => {
    if (newPath === '..') {
      // Go up one directory
      const pathParts = currentPath.split('/').filter(p => p && p !== '.');
      pathParts.pop();
      const parentPath = pathParts.length > 0 ? pathParts.join('/') : '.';
      setCurrentPath(parentPath);
    } else {
      const fullPath = currentPath === '.' ? newPath : `${currentPath}/${newPath}`;
      setCurrentPath(fullPath);
    }
  };

  const openFile = async (filename) => {
    try {
      const filePath = currentPath === '.' ? filename : `${currentPath}/${filename}`;
      const response = await axios.get(`/api/servers/${id}/files/content`, {
        params: { path: filePath }
      });
      
      setSelectedFile({
        name: filename,
        path: filePath,
        ...response.data
      });
      setFileContent(response.data.content);
      setIsEditing(false);
    } catch (error) {
      console.error('Error opening file:', error);
      toast.error('Failed to open file');
    }
  };

  const saveFile = async () => {
    try {
      await axios.put(`/api/servers/${id}/files/content`, {
        path: selectedFile.path,
        content: fileContent
      });
      
      toast.success('File saved successfully');
      setIsEditing(false);
      loadFiles(); // Refresh file list
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Failed to save file');
    }
  };

  const createFolder = async () => {
    try {
      await axios.post(`/api/servers/${id}/files/directory`, {
        path: currentPath,
        name: newFolderName
      });
      
      toast.success('Folder created successfully');
      setNewFolderName('');
      setShowNewFolder(false);
      loadFiles();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const deleteItem = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      const filePath = currentPath === '.' ? filename : `${currentPath}/${filename}`;
      await axios.delete(`/api/servers/${id}/files`, {
        params: { path: filePath }
      });
      
      toast.success('Item deleted successfully');
      
      // If we were viewing the deleted file, clear it
      if (selectedFile && selectedFile.name === filename) {
        setSelectedFile(null);
        setFileContent('');
        setIsEditing(false);
      }
      
      loadFiles();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const breadcrumbs = currentPath === '.' ? [] : currentPath.split('/');

  return (
    <div className="h-full flex bg-gray-900">
      {/* File Browser */}
      <div className="w-1/2 border-r border-gray-700 flex flex-col">
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">File Manager</h3>
            <button
              onClick={() => setShowNewFolder(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              New Folder
            </button>
          </div>
          
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-300">
            <button
              onClick={() => setCurrentPath('.')}
              className="hover:text-white"
            >
              /
            </button>
            {breadcrumbs.map((part, index) => (
              <React.Fragment key={index}>
                <span className="mx-1">/</span>
                <button
                  onClick={() => {
                    const newPath = breadcrumbs.slice(0, index + 1).join('/');
                    setCurrentPath(newPath);
                  }}
                  className="hover:text-white"
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* New Folder Modal */}
        {showNewFolder && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h4 className="text-white font-semibold mb-4">Create New Folder</h4>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full p-2 bg-gray-700 text-white rounded mb-4"
                onKeyPress={(e) => e.key === 'Enter' && createFolder()}
              />
              <div className="flex space-x-2">
                <button
                  onClick={createFolder}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-gray-400">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {/* Parent directory link */}
              {currentPath !== '.' && (
                <div
                  onClick={() => navigateToPath('..')}
                  className="p-3 hover:bg-gray-700 cursor-pointer flex items-center text-gray-300"
                >
                  <span className="mr-2">📁</span>
                  <span>.. (Parent Directory)</span>
                </div>
              )}

              {/* Files and directories */}
              {files.map((file) => (
                <div
                  key={file.name}
                  className="p-3 hover:bg-gray-700 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => 
                        file.type === 'directory' 
                          ? navigateToPath(file.name)
                          : openFile(file.name)
                      }
                      className="flex items-center flex-1"
                    >
                      <span className="mr-2">
                        {file.type === 'directory' ? '📁' : '📄'}
                      </span>
                      <div>
                        <div className="text-white">{file.name}</div>
                        {file.size && (
                          <div className="text-xs text-gray-400">
                            {formatFileSize(file.size)}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(file.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {files.length === 0 && (
                <div className="p-4 text-gray-400 text-center">
                  No files or directories found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Editor */}
      <div className="w-1/2 flex flex-col">
        {selectedFile ? (
          <>
            <div className="bg-gray-800 p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold">{selectedFile.name}</h4>
                  <p className="text-sm text-gray-400">
                    {formatFileSize(selectedFile.size)} • 
                    {new Date(selectedFile.modified).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveFile}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          // Reset content to original
                          setFileContent(selectedFile.content);
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-4">
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                readOnly={!isEditing}
                className={`w-full h-full bg-gray-800 text-white font-mono text-sm p-4 rounded resize-none ${
                  isEditing ? 'border-blue-500 border' : ''
                }`}
                style={{ fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a file to view or edit
          </div>
        )}
      </div>
    </div>
  );
}

export default FileManager;