/* ================================================================
   MEMBERS LIST MODULE v2 — Status, Print Form, Excel Export
   ================================================================ */
var App = window.App || {};
App.Members = {
    page: 1, perPage: 10, sortField: 'memberName', sortDir: 'asc', query: '', statusFilter: 'all', deleteId: null,

    init: function () {
        var self = this;
        document.getElementById('searchInput').addEventListener('input', function () { self.query = this.value; self.page = 1; self.render(); });
        document.getElementById('statusFilter').addEventListener('change', function () { self.statusFilter = this.value; self.page = 1; self.render(); });
        document.getElementById('exportCsvBtn').addEventListener('click', function () { self.exportCSV(); });
        document.getElementById('exportExcelBtn').addEventListener('click', function () { self.exportExcel(); });
        document.getElementById('exportPrintBtn').addEventListener('click', function () { window.print(); });
        document.getElementById('cancelDelete').addEventListener('click', function () { self._hideDelete(); });
        document.getElementById('confirmDelete').addEventListener('click', function () {
            if (self.deleteId) { App.DB.delete(self.deleteId); App.toast('Member deleted', 'success'); self.deleteId = null; self._hideDelete(); App.refreshAll(); }
        });
    },

    render: function () {
        var members = App.DB.search(this.query, this.statusFilter);
        var f = this.sortField, d = this.sortDir;
        members.sort(function (a, b) { var va = (a[f] || '').toString().toLowerCase(), vb = (b[f] || '').toString().toLowerCase(); return va < vb ? (d === 'asc' ? -1 : 1) : va > vb ? (d === 'asc' ? 1 : -1) : 0; });
        var tp = Math.ceil(members.length / this.perPage) || 1; if (this.page > tp) this.page = tp;
        var start = (this.page - 1) * this.perPage;
        this._table(members.slice(start, start + this.perPage), members.length);
        this._pagination(tp);
    },

    _table: function (members, total) {
        var c = document.getElementById('tableWrap'), self = this;
        if (!total) { c.innerHTML = '<div class="table-empty"><p>' + (this.query ? 'No matches found' : 'No members yet') + '</p></div>'; return; }
        var sa = function (f) { var cls = self.sortField === f ? 'sorted' : '', arr = self.sortField === f ? (self.sortDir === 'asc' ? '▲' : '▼') : '▲'; return ' class="' + cls + '" data-sort="' + f + '"><span class="sort-arrow">' + arr + '</span>'; };
        var h = '<table><thead><tr><th' + sa('memberName') + 'Name</th><th' + sa('dob') + 'DOB</th><th' + sa('gothram') + 'Gothram</th><th' + sa('bloodGroup') + 'Blood</th><th' + sa('mobileNumber') + 'Mobile</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        h += members.map(function (m) {
            return '<tr><td>' + App.Utils.escapeHtml(m.memberName) + '</td><td>' + App.Utils.formatDate(m.dob) + '</td><td>' + App.Utils.escapeHtml(m.gothram) + '</td><td>' + App.Utils.escapeHtml(m.bloodGroup) + '</td><td>' + App.Utils.escapeHtml(m.mobileNumber) + '</td><td><span class="status-badge status-' + m.status + '">' + m.status + '</span></td><td><div class="td-actions"><button class="act-btn" onclick="App.Form.loadMember(\'' + m.id + '\')" title="Edit">✏️</button><button class="act-btn" onclick="App.Members.printForm(\'' + m.id + '\')" title="Print Form">🖨️</button><button class="act-btn act-delete" onclick="App.Members.confirmDelete(\'' + m.id + '\')" title="Delete">🗑️</button></div></td></tr>';
        }).join('');
        h += '</tbody></table>';
        c.innerHTML = h;
        c.querySelectorAll('th[data-sort]').forEach(function (th) {
            th.addEventListener('click', function () { var f = this.getAttribute('data-sort'); if (self.sortField === f) self.sortDir = self.sortDir === 'asc' ? 'desc' : 'asc'; else { self.sortField = f; self.sortDir = 'asc'; } self.render(); });
        });
    },

    _pagination: function (tp) {
        var c = document.getElementById('pagination'), self = this;
        if (tp <= 1) { c.innerHTML = ''; return; }
        var h = '<button class="page-btn" data-p="' + (this.page - 1) + '"' + (this.page <= 1 ? ' disabled' : '') + '>‹</button>';
        for (var i = 1; i <= tp; i++) h += '<button class="page-btn' + (i === this.page ? ' active' : '') + '" data-p="' + i + '">' + i + '</button>';
        h += '<button class="page-btn" data-p="' + (this.page + 1) + '"' + (this.page >= tp ? ' disabled' : '') + '>›</button>';
        c.innerHTML = h;
        c.querySelectorAll('.page-btn').forEach(function (b) { b.addEventListener('click', function () { var p = parseInt(this.getAttribute('data-p')); if (p >= 1 && p <= tp) { self.page = p; self.render(); } }); });
    },

    confirmDelete: function (id) { this.deleteId = id; document.getElementById('deleteModal').classList.add('show'); },
    _hideDelete: function () { document.getElementById('deleteModal').classList.remove('show'); this.deleteId = null; },

    // ===== PRINT INDIVIDUAL FORM =====
    printForm: function (id) {
        var m = App.DB.getById(id); if (!m) return;
        var esc = App.Utils.escapeHtml, fd = App.Utils.formatDateLong;
        var photoHtml = m.photoFile ? '<img src="' + m.photoFile + '" style="width:110px;height:140px;object-fit:cover;border:1px solid #ccc;display:block">' : '<div style="width:110px;height:140px;border:1px dashed #999;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px;text-align:center">Affix Photo<br>Here</div>';
        var aadhaarHtml = m.aadhaarFile ? '<img src="' + m.aadhaarFile + '" style="max-width:100%;max-height:160px;border:1px solid #ccc;border-radius:4px">' : '<span style="color:#999;font-size:12px">Not uploaded</span>';
        var paymentHtml = m.paymentProof ? '<img src="' + m.paymentProof + '" style="max-width:100%;max-height:160px;border:1px solid #ccc;border-radius:4px">' : '<span style="color:#999;font-size:12px">Not uploaded</span>';
        var statusColor = m.status === 'approved' ? '#2e7d32' : m.status === 'rejected' ? '#c62828' : '#e65100';

        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Membership Form - ' + esc(m.memberName) + '</title><style>'
            + 'body{font-family:Georgia,serif;padding:20px;color:#222;max-width:800px;margin:0 auto;font-size:13px;line-height:1.4}'
            + '.top-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}'
            + '.top-left{flex:1;text-align:center}'
            + '.top-right{width:110px;margin-left:20px}'
            + 'h1{font-size:1.3rem;margin:0;color:#880E4F} h2{font-size:.9rem;margin:4px 0 0;color:#555;font-weight:400}'
            + '.divider{text-align:center;margin:8px 0;color:#C2185B;font-size:.7rem} .divider::before,.divider::after{content:"";display:inline-block;width:60px;height:1px;background:#ccc;vertical-align:middle;margin:0 12px}'
            + '.label{text-align:center;font-size:.8rem;color:#880E4F;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}'
            + '.status{text-align:center;margin-bottom:12px} .status span{padding:3px 12px;border-radius:10px;font-size:.75rem;font-weight:600;color:white;background:' + statusColor + '}'
            + 'table{width:100%;border-collapse:collapse;margin-bottom:12px} th,td{padding:6px 10px;text-align:left;border-bottom:1px solid #e0e0e0;font-size:.85rem}'
            + 'th{width:130px;color:#666;font-weight:500} td{color:#222;font-weight:600}'
            + '.section-title{font-size:.85rem;font-weight:700;color:#880E4F;padding:8px 0 4px;border-bottom:2px solid #880E4F;margin-top:8px}'
            + '.docs-grid{display:flex;gap:20px;margin-bottom:12px}'
            + '.doc-box{flex:1}'
            + '.disclaimer{background:#FFF8E1;border:1px solid #FFE082;border-radius:6px;padding:10px;margin:16px 0;font-size:.75rem;color:#5D4037;line-height:1.4}'
            + '.signatures{display:flex;justify-content:space-between;margin-top:20px;padding-top:10px}'
            + '.sig-box{text-align:center;width:180px} .sig-line{border-top:1px solid #333;padding-top:4px;font-size:.75rem;color:#666}'
            + '.footer{text-align:center;margin-top:16px;font-size:.7rem;color:#999;border-top:1px solid #ddd;padding-top:8px}'
            + '@media print{body{padding:0} .disclaimer{border:1px solid #ddd}}'
            + '</style></head><body>'
            + '<div class="top-header">'
            + '<div class="top-left">'
            + '<div style="margin-bottom:8px"><img src="vasavi-bg.png" style="height:80px;width:auto;object-fit:contain"></div>'
            + '<h1>SRI VASAVI KANYAKA PARAMESHWERI KALYANA MANDAPAM COMITEE</h1>'
            + '<h2 style="font-size:0.75rem; text-transform:uppercase; font-weight:600; margin-top:6px; color:#555">H.NO-- 5-12, KUSUMANCHI ROAD, NELAKONDAPALLY, KHAMMAM DIST - REGISTERED NUMBER 56/2026</h2>'
            + '<div class="divider">◆</div>'
            + '<div class="label">Membership Application Form</div>'
            + '<div class="status"><span>' + m.status.toUpperCase() + '</span></div>'
            + '</div>'
            + '<div class="top-right">' + photoHtml + '</div>'
            + '</div>'
            + '<div class="section-title">👤 Personal Details</div>'
            + '<table><tr><th>Application No</th><td>' + m.id.substring(0, 10) + '</td><th>Date of Birth</th><td>' + fd(m.dob) + '</td></tr>'
            + '<tr><th>Member Name</th><td colspan="3">' + esc(m.memberName) + '</td></tr>'
            + '<tr><th>Father\'s Name</th><td colspan="3">' + esc(m.fatherName) + '</td></tr>'
            + '<tr><th>Spouse Name</th><td colspan="3">' + esc(m.spouseName || '—') + '</td></tr>'
            + '<tr><th>Gothram</th><td>' + esc(m.gothram) + '</td><th>Blood Group</th><td>' + esc(m.bloodGroup) + '</td></tr>'
            + '<tr><th>Marriage Date</th><td colspan="3">' + fd(m.marriageDay) + '</td></tr>'
            + '<tr><th>Mobile Number</th><td>' + esc(m.mobileNumber) + '</td><th>Address</th><td>' + esc(m.address) + '</td></tr></table>'
            + '<div class="docs-grid">'
            + '<div class="doc-box"><div class="section-title" style="margin-top:0">🆔 Identity Proof</div><div style="padding:8px 0">' + aadhaarHtml + '</div></div>'
            + '<div class="doc-box"><div class="section-title" style="margin-top:0">💳 Payment Proof</div><div style="padding:8px 0">' + paymentHtml + '</div></div>'
            + '</div>'
            + '<div class="disclaimer"><strong>⚖️ Disclaimer:</strong> The management of Sri Vasavi Kanyakaparameshwari Kalyana Mandapam Committee reserves the right to accept or reject any membership application without providing a reason.</div>'
            + '<div class="signatures"><div class="sig-box" style="margin-top:60px"><div class="sig-line">Applicant Signature</div></div><div class="sig-box" style="margin-top:60px"><div class="sig-line">For Committee Use</div></div></div>'
            + '<div class="footer">Generated on ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + ' • Sri Vasavi Kanyakaparameshwari Kalyana Mandapam Committee</div>'
            + '</body></html>';

        var w = window.open('', '_blank');
        w.document.write(html); w.document.close();
        setTimeout(function () { w.print(); }, 500);
    },

    // ===== EXPORT CSV =====
    exportCSV: function () {
        var members = App.DB.getAll();
        if (!members.length) { App.toast('No data to export', 'warning'); return; }
        var headers = ['Name', 'DOB', 'Father', 'Spouse', 'Gothram', 'Marriage Date', 'Blood Group', 'Address', 'Mobile', 'Status'];
        var rows = members.map(function (m) {
            return [m.memberName, m.dob, m.fatherName, m.spouseName || '', m.gothram, m.marriageDay || '', m.bloodGroup, (m.address || '').replace(/"/g, '""'), m.mobileNumber, m.status].map(function (v) { return '"' + v + '"'; }).join(',');
        });
        var csv = headers.join(',') + '\n' + rows.join('\n');
        this._download(new Blob([csv], { type: 'text/csv' }), 'SVKP_Members_' + new Date().toISOString().split('T')[0] + '.csv');
        App.toast('CSV exported! 📊', 'success');
    },

    // ===== EXPORT EXCEL =====
    exportExcel: function () {
        var members = App.DB.getAll();
        if (!members.length) { App.toast('No data to export', 'warning'); return; }
        var html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>th{background:#880E4F;color:white;padding:8px;font-size:12px} td{padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px} table{border-collapse:collapse}</style></head><body><table><thead><tr><th>Name</th><th>DOB</th><th>Father</th><th>Spouse</th><th>Gothram</th><th>Marriage Date</th><th>Blood Group</th><th>Address</th><th>Mobile</th><th>Status</th></tr></thead><tbody>';
        html += members.map(function (m) {
            return '<tr><td>' + App.Utils.escapeHtml(m.memberName) + '</td><td>' + App.Utils.formatDate(m.dob) + '</td><td>' + App.Utils.escapeHtml(m.fatherName) + '</td><td>' + App.Utils.escapeHtml(m.spouseName || '') + '</td><td>' + App.Utils.escapeHtml(m.gothram) + '</td><td>' + App.Utils.formatDate(m.marriageDay) + '</td><td>' + App.Utils.escapeHtml(m.bloodGroup) + '</td><td>' + App.Utils.escapeHtml(m.address) + '</td><td>' + App.Utils.escapeHtml(m.mobileNumber) + '</td><td>' + m.status + '</td></tr>';
        }).join('');
        html += '</tbody></table></body></html>';
        this._download(new Blob([html], { type: 'application/vnd.ms-excel' }), 'SVKP_Members_' + new Date().toISOString().split('T')[0] + '.xls');
        App.toast('Excel exported! 📗', 'success');
    },

    _download: function (blob, name) { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); }
};
window.App = App;
