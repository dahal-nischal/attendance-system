import React, { useState, useEffect } from "react";
import axios from "axios";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';
import { Toolbar } from 'primereact/toolbar';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { FilterMatchMode } from 'primereact/api';
import * as XLSX from 'xlsx'; // For exporting to Excel
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import './App.css';
import { format, toZonedTime } from 'date-fns-tz';
function App() {
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.EQUALS }
  });
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dashboardStats, setDashboardStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    total: 0
  });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordDialog, setRecordDialog] = useState(false);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await axios.get("https://vovoureducation.com/api/attendances");
      setAttendance(response.data);
      setFilteredAttendance(response.data);

      // Calculate dashboard stats
      const stats = {
        present: 0,
        late: 0,
        absent: 0,
        total: response.data.length
      };

      response.data.forEach(record => {
        if (record.status === 'Present') stats.present++;
        else if (record.status === 'Late') stats.late++;
        else if (record.status === 'Absent') stats.absent++;
      });

      setDashboardStats(stats);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const deleteAttendance = async (attendance) => {
    try {
      // Use attendance_id to delete the record
      await axios.delete(`https://vovoureducation.com/api/attendances/${attendance.attendance_id}`);

      // Update state after successful deletion
      setAttendance(prevAttendance => prevAttendance.filter(item => item.attendance_id !== attendance.attendance_id));
      setFilteredAttendance(prevFilteredAttendance => prevFilteredAttendance.filter(item => item.attendance_id !== attendance.attendance_id));
    } catch (error) {
      console.error("Error deleting attendance:", error);
    }
  };

  const confirmDelete = (attendance) => {
    confirmDialog({
      message: "Are you sure you want to delete this record?",
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      accept: () => deleteAttendance(attendance)
    });
  };

  // Apply all filters whenever filter values change
  useEffect(() => {
    applyFilters();
  }, [globalFilterValue, selectedDate, selectedStatus, attendance]);

  const applyFilters = () => {
    let filtered = [...attendance];

    // Apply global text filter
    if (globalFilterValue) {
      filtered = filtered.filter(record => {
        return Object.keys(record).some(field => {
          // Skip filtering on complex objects
          if (typeof record[field] === 'object') return false;

          return record[field] && record[field].toString().toLowerCase().includes(globalFilterValue.toLowerCase());
        });
      });
    }

    // Apply date filter
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);

      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === filterDate.getTime();
      });
    }

    // Apply status filter
    if (selectedStatus) {
      filtered = filtered.filter(record => record.status === selectedStatus);
    }

    setFilteredAttendance(filtered);

    // Update dashboard stats based on filtered data
    updateDashboardStats(filtered);
  };

  const updateDashboardStats = (data) => {
    const stats = {
      present: 0,
      late: 0,
      absent: 0,
      total: data.length
    };

    data.forEach(record => {
      if (record.status === 'Present') stats.present++;
      else if (record.status === 'Late') stats.late++;
      else if (record.status === 'Absent') stats.absent++;
    });

    setDashboardStats(stats);
  };

  const onGlobalFilterChange = (e) => {
    setGlobalFilterValue(e.target.value);
  };

  const onDateFilterChange = (e) => {
    setSelectedDate(e.value);
  };

  const onStatusFilterChange = (e) => {
    setSelectedStatus(e.value);
  };

  const clearFilters = () => {
    setGlobalFilterValue('');
    setSelectedDate(null);
    setSelectedStatus('');
  };

  const leftToolbarTemplate = () => {
    return (
      <div className="flex align-items-center">
        <i className="pi pi-calendar-plus text-2xl mr-2 text-primary"></i>
        <h1 className="m-0">Attendance Dashboard</h1>
      </div>
    );
  };

  const rightToolbarTemplate = () => {
    return (
      <React.Fragment>
        <Button label="Clear Filters" icon="pi pi-filter-slash" className="p-button-warning mr-2" onClick={clearFilters} disabled={!globalFilterValue && !selectedDate && !selectedStatus} />
        <Button label="Refresh" icon="pi pi-refresh" className="p-button-info mr-2" onClick={fetchAttendance} />
        <Button label="Export" icon="pi pi-download" className="p-button-success" onClick={exportToExcel} />
      </React.Fragment>
    );
  };

  const statusBodyTemplate = (record) => {
    const statusMap = {
      'Present': { class: 'status-present', icon: 'pi-check-circle' },
      'Late': { class: 'status-late', icon: 'pi-exclamation-circle' },
      'Absent': { class: 'status-absent', icon: 'pi-times-circle' }
    };

    const statusInfo = statusMap[record.status] || { class: '', icon: 'pi-info-circle' };

    return (
      <span className={`status-badge ${statusInfo.class}`}>
        <i className={`pi ${statusInfo.icon} mr-2`}></i>
        {record.status}
      </span>
    );
  };

  const actionBodyTemplate = (rowData) => {
    return (
      <div className="flex">
        <Button icon="pi pi-eye" className="p-button-rounded p-button-info p-button-text mr-2" onClick={() => viewDetails(rowData)} />
        <Button icon="pi pi-trash" className="p-button-rounded p-button-danger p-button-text" onClick={() => confirmDelete(rowData)} />
      </div>
    );
  };



  const timeBodyTemplate = (rowData, field) => {
    const isoString = rowData[field];
    if (!isoString) return '-';

    // Parse the ISO string
    const date = new Date(isoString);

    // Extract date part (YYYY-MM-DD)
    const datePart = date.toISOString().split('T')[0];

    // Format time with AM/PM
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    // Format with leading zeros
    const formattedTime =
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;

    return (
      <span>
        <div>Date: {datePart}</div>
        <div>Time: {formattedTime}</div>
      </span>
    );
  };

  const dateBodyTemplate = (rowData) => {
    const date = new Date(rowData.date);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const workingHoursTemplate = (rowData) => {
    const hours = parseFloat(rowData.working_hours);

    if (isNaN(hours)) return '-';

    // Convert to hours and minutes
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    // Format the display
    if (wholeHours === 0) {
      return <span>{minutes} minutes</span>;
    } else if (minutes === 0) {
      return <span>{wholeHours} hour{wholeHours !== 1 ? 's' : ''}</span>;
    } else {
      return <span>{wholeHours} hour{wholeHours !== 1 ? 's' : ''} {minutes} minute{minutes !== 1 ? 's' : ''}</span>;
    }
  };
  const viewDetails = (record) => {
    setSelectedRecord(record);
    setRecordDialog(true);
  };

  const hideDialog = () => {
    setRecordDialog(false);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredAttendance);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "Attendance_Records.xlsx");
  };

  const header = (
    <div className="table-header flex flex-column md:flex-row justify-content-between align-items-center">
      <div className="p-input-icon-left mb-2 md:mb-0">
        <i className="pi pi-search left-[5%]" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder="Search..."
          className="p-inputtext"
        />
      </div>
      <div className="flex flex-column sm:flex-row">
        <Calendar
          value={selectedDate}
          onChange={onDateFilterChange}
          placeholder="Filter by date"
          className="mr-2 mb-2 sm:mb-0"
          showClear
        />
        <Dropdown
          value={selectedStatus}
          options={[
            { label: 'All Statuses', value: '' },
            { label: 'Present', value: 'Present' },
            { label: 'Late', value: 'Late' },
            { label: 'Absent', value: 'Absent' }
          ]}
          onChange={onStatusFilterChange}
          placeholder="Filter by status"
          className="mr-2"
          showClear
        />
      </div>
    </div>
  );

  const recordDialogFooter = (
    <React.Fragment>
      <Button label="Close" icon="pi pi-times" className="p-button-text" onClick={hideDialog} />
    </React.Fragment>
  );

  return (
    <div className="attendance-app p-4">
      <Toolbar className="mb-4 toolbar-custom" left={leftToolbarTemplate} right={rightToolbarTemplate} />

      <div className="grid">
        <div className="col-12 lg:col-3">
          <Card className="stat-card bg-bluegray-50">
            <div className="stat-title">Total Records</div>
            <div className="stat-value">{dashboardStats.total}</div>
            <div className="stat-icon">
              <i className="pi pi-users"></i>
            </div>
          </Card>
        </div>
        <div className="col-12 lg:col-3">
          <Card className="stat-card bg-green-50">
            <div className="stat-title">Present</div>
            <div className="stat-value">{dashboardStats.present}</div>
            <div className="stat-icon">
              <i className="pi pi-check-circle"></i>
            </div>
          </Card>
        </div>
        <div className="col-12 lg:col-3">
          <Card className="stat-card bg-yellow-50">
            <div className="stat-title">Late</div>
            <div className="stat-value">{dashboardStats.late}</div>
            <div className="stat-icon">
              <i className="pi pi-exclamation-triangle"></i>
            </div>
          </Card>
        </div>
        <div className="col-12 lg:col-3">
          <Card className="stat-card bg-red-50">
            <div className="stat-title">Absent</div>
            <div className="stat-value">{dashboardStats.absent}</div>
            <div className="stat-icon">
              <i className="pi pi-times-circle"></i>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4 main-card">
        <h2><i className="pi pi-list mr-2"></i>Attendance Records</h2>
        <DataTable
          value={filteredAttendance}
          responsiveLayout="scroll"
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} records"
          loading={loading}
          emptyMessage="No attendance records found"
          header={header}
          className="custom-datatable"
          rowClassName={() => 'table-row-custom'}
          scrollable
          scrollHeight="400px"
        >
          <Column field="user_name" header="User Name" sortable style={{ minWidth: '8rem' }}></Column>
          <Column field="date" header="Date" body={dateBodyTemplate} sortable style={{ minWidth: '10rem' }}></Column>
          <Column field="in_time" header="In Time" body={(rowData) => timeBodyTemplate(rowData, 'in_time')} sortable style={{ minWidth: '8rem' }}></Column>
          <Column field="out_time" header="Out Time" body={(rowData) => timeBodyTemplate(rowData, 'out_time')} sortable style={{ minWidth: '8rem' }}></Column>
          <Column
            field="working_hours"
            header="Working Hours"
            body={workingHoursTemplate}
            sortable
            style={{ minWidth: '10rem' }}
          />
          <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '10rem' }}></Column>
          <Column body={actionBodyTemplate} exportable={false} style={{ minWidth: '8rem' }}></Column>
        </DataTable>
      </Card>
      <ConfirmDialog />
      <Dialog
        visible={recordDialog}
        style={{ width: '450px' }}
        header="Attendance Details"
        modal
        className="p-fluid"
        footer={recordDialogFooter}
        onHide={hideDialog}
      >
        {selectedRecord && (
          <div className="record-details grid">
            <div className="col-12 md:col-6 detail-item">
              <label>User Name</label>
              <div className="detail-value">{selectedRecord.user_name}</div>
            </div>
            <div className="col-12 md:col-6 detail-item">
              <label>Date</label>
              <div className="detail-value">
                {new Date(selectedRecord.date).toLocaleDateString()}
              </div>
            </div>
            <div className="col-12 md:col-6 detail-item">
              <label>In Time</label>
              <div className="detail-value">{selectedRecord.in_time || '-'}</div>
            </div>
            <div className="col-12 md:col-6 detail-item">
              <label>Out Time</label>
              <div className="detail-value">{selectedRecord.out_time || '-'}</div>
            </div>
            <div className="col-12 detail-item">
              <label>Working Hours</label>
              <div className="detail-value">{selectedRecord.working_hours}</div>
            </div>
            <div className="col-12 detail-item">
              <label>Status</label>
              <div className="detail-value">{statusBodyTemplate(selectedRecord)}</div>
            </div>
          </div>
        )}
      </Dialog>

    </div>
  );
}

export default App;