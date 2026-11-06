(() => {
  "use strict";

  const STORAGE_KEY = "carTrackingDataV2";
  const LEGACY_VEHICLES_KEY = "carTrackingVehicles";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dateBR = value => {
    if (!value) return "—";
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR");
  };
  const uid = () => (window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") return {
        vehicles: Array.isArray(saved.vehicles) ? saved.vehicles : [],
        maintenances: Array.isArray(saved.maintenances) ? saved.maintenances : [],
        documents: Array.isArray(saved.documents) ? saved.documents : [],
        fuels: Array.isArray(saved.fuels) ? saved.fuels : [],
        expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
        reminders: Array.isArray(saved.reminders) ? saved.reminders : []
      };
    } catch (error) { console.warn("Falha ao ler os dados salvos:", error); }
    let oldVehicles = [];
    try { oldVehicles = JSON.parse(localStorage.getItem(LEGACY_VEHICLES_KEY) || "[]"); } catch (_) {}
    return { vehicles: Array.isArray(oldVehicles) ? oldVehicles : [], maintenances: [], documents: [], fuels: [], expenses: [], reminders: [] };
  }

  const data = loadData();
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Mantém compatibilidade com a versão anterior do cadastro de veículos.
      localStorage.setItem(LEGACY_VEHICLES_KEY, JSON.stringify(data.vehicles));
      return true;
    } catch (error) {
      console.error("Não foi possível salvar no navegador:", error);
      toast("Não foi possível salvar. O armazenamento do navegador pode estar cheio.", "error");
      return false;
    }
  }

  function toast(message, type = "success") {
    const region = $("#toastRegion");
    if (!region) { window.alert(message); return; }
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.textContent = message;
    region.append(item);
    setTimeout(() => item.remove(), 3500);
  }

  function vehicleName(id) {
    const v = data.vehicles.find(item => item.id === id);
    return v ? `${v.nickname} — ${v.brand} ${v.model}` : "Veículo não encontrado";
  }

  function openModal(id) {
    const modal = typeof id === "string" ? document.getElementById(id) : id;
    if (!modal) return;
    if (modal.id !== "vehicleModal" && data.vehicles.length === 0) {
      toast("Cadastre um veículo antes de adicionar este registro.", "error");
      closeAllModals();
      openModal("vehicleModal");
      return;
    }
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    refreshVehicleSelects();
    const first = $("input:not([type=file]), select, textarea", modal);
    if (first) setTimeout(() => first.focus(), 60);
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    if (!$(".modal-backdrop.active")) document.body.style.overflow = "";
  }
  function closeAllModals() {
    $$(".modal-backdrop.active").forEach(modal => modal.classList.remove("active"));
    document.body.style.overflow = "";
  }

  // Navegação entre as telas e navegação mobile.
  const pageNames = { dashboard: "Visão geral", vehicles: "Minha garagem", maintenance: "Manutenções", documents: "Documentos", fuel: "Abastecimento", expenses: "Despesas", history: "Histórico", reminders: "Lembretes" };
  function showPage(page) {
    if (!pageNames[page]) return;
    $$(".page-section").forEach(section => section.classList.toggle("active", section.id === `page-${page}`));
    $$(".nav-link[data-page]").forEach(button => button.classList.toggle("active", button.dataset.page === page));
    const crumb = $("#breadcrumbCurrent");
    if (crumb) crumb.textContent = pageNames[page];
    $("#sidebar")?.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function refreshVehicleSelects() {
    $$("select.vehicle-options, #dashboardVehicleSelect, #historyVehicleFilter").forEach(select => {
      const current = select.value;
      const allOption = select.id === "dashboardVehicleSelect" || select.id === "historyVehicleFilter";
      select.innerHTML = `<option value="">${allOption ? "Todos os veículos" : "Selecione um veículo"}</option>` +
        data.vehicles.map(v => `<option value="${esc(v.id)}">${esc(v.nickname)} — ${esc(v.brand)} ${esc(v.model)}</option>`).join("");
      if (data.vehicles.some(v => v.id === current)) select.value = current;
    });
    // O formulário de manutenção exige uma escolha real; se não há veículo, não oferece opção vazia válida.
  }

  function emptyRow(cols, message) { return `<tr><td colspan="${cols}" class="table-empty">${esc(message)}</td></tr>`; }
  function renderVehicles() {
    const search = ($("#vehicleSearch")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const list = data.vehicles.filter(v => [v.nickname, v.brand, v.model, v.plate].some(x => String(x || "").toLocaleLowerCase("pt-BR").includes(search)));
    const grid = $("#vehicleGrid");
    if (grid) grid.innerHTML = list.length ? list.map(v => `
      <article class="vehicle-card">
        <div class="vehicle-card-image"><i data-lucide="car-front"></i></div>
        <div class="vehicle-card-content"><h3>${esc(v.nickname)}</h3><p>${esc(v.brand)} ${esc(v.model)}</p>
          <div class="vehicle-details">
            <div><span>ANO/MODELO</span><strong>${esc(v.modelYear || v.year || "—")}</strong></div>
            <div><span>QUILOMETRAGEM</span><strong>${v.km ? `${esc(v.km)} km` : "—"}</strong></div>
            <div><span>PLACA</span><strong>${esc(v.plate || "—")}</strong></div>
            <div><span>COMBUSTÍVEL</span><strong>${esc(v.fuel || "—")}</strong></div>
          </div>
        </div><div class="vehicle-card-actions"><button type="button" class="danger" data-action="delete" data-kind="vehicles" data-id="${esc(v.id)}">Excluir</button></div>
      </article>`).join("") : `<div class="empty-state wide"><div class="empty-icon"><i data-lucide="car-front"></i></div><strong>${data.vehicles.length ? "Nenhum veículo encontrado" : "Sua garagem está vazia"}</strong><p>${data.vehicles.length ? "Tente outra busca." : "Cadastre um veículo para começar."}</p></div>`;
    const total = $("#vehicleTotal"); if (total) total.textContent = `${list.length} ${list.length === 1 ? "veículo" : "veículos"}`;
    const stat = $("#statVehicles"); if (stat) stat.textContent = data.vehicles.length;
    const featured = $("#featuredVehicle");
    if (featured) {
      if (!data.vehicles.length) featured.innerHTML = `<div class="empty-icon"><i data-lucide="car-front"></i></div><strong>Nenhum veículo cadastrado</strong><p>Adicione seu primeiro veículo para começar.</p><button class="btn btn-primary btn-small" data-open-modal="vehicleModal">Cadastrar veículo</button>`;
      else { const v = data.vehicles[0]; featured.innerHTML = `<h3>${esc(v.nickname)}</h3><p>${esc(v.brand)} ${esc(v.model)} ${esc(v.modelYear || v.year || "")}</p><p class="muted">${v.km ? `${esc(v.km)} km` : "Quilometragem não informada"}${v.plate ? ` · ${esc(v.plate)}` : ""}</p><p class="muted">${esc(v.fuel || "Combustível não informado")}${v.color ? ` · ${esc(v.color)}` : ""}</p>`; }
    }
    refreshVehicleSelects();
  }

  function renderMaintenances() {
    const term = ($("#maintenanceSearch")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const category = $("#maintenanceFilter")?.value || "";
    const records = [...data.maintenances].filter(m => (!category || m.category === category) && [m.title, m.category, m.shop, m.notes, vehicleName(m.vehicleId)].some(x => String(x || "").toLocaleLowerCase("pt-BR").includes(term))).sort((a,b) => (b.date || "").localeCompare(a.date || ""));
    const table = $("#maintenanceTable");
    if (table) table.innerHTML = records.length ? records.map(m => `<tr>
      <td><strong>${esc(m.title)}</strong>${m.shop ? `<small class="table-subtext">${esc(m.shop)}</small>` : ""}</td>
      <td>${esc(m.category || "Outro")}</td><td>${esc(vehicleName(m.vehicleId))}</td><td>${dateBR(m.date)}</td>
      <td>${m.km ? `${esc(m.km)} km` : "—"}</td><td>${money(m.cost)}</td>
      <td><button class="text-button danger-text" type="button" data-action="delete" data-kind="maintenances" data-id="${esc(m.id)}">Excluir</button></td></tr>`).join("") : emptyRow(7, "Nenhuma manutenção encontrada.");
    const stat = $("#statMaintenance"); if (stat) stat.textContent = data.maintenances.length;
  }

  function renderDocuments() {
    const grid = $("#documentGrid"); if (!grid) return;
    grid.innerHTML = data.documents.length ? data.documents.slice().sort((a,b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).map(d => `
      <article class="document-card"><div class="document-icon"><i data-lucide="file-text"></i></div>
      <h3>${esc(d.title)}</h3><p>${esc(d.type)} · ${esc(vehicleName(d.vehicleId))}</p>
      <p>${d.dueDate ? `Vencimento: ${dateBR(d.dueDate)}` : "Sem vencimento informado"}</p>
      ${d.fileName ? `<p class="muted">${esc(d.fileName)}</p>` : ""}
      <div class="document-card-actions">${d.fileData ? `<a class="text-button" href="${d.fileData}" download="${esc(d.fileName || "documento")}">Abrir arquivo</a>` : ""}<button class="text-button danger-text" type="button" data-action="delete" data-kind="documents" data-id="${esc(d.id)}">Excluir</button></div></article>`).join("") : `<div class="empty-state wide"><div class="empty-icon"><i data-lucide="folder-open"></i></div><strong>Nenhum documento cadastrado</strong><p>Adicione CRLV, seguro, manual e comprovantes.</p></div>`;
  }

  function renderFuel() {
    const rows = $("#fuelTable");
    if (rows) rows.innerHTML = data.fuels.length ? data.fuels.slice().sort((a,b) => (b.date || "").localeCompare(a.date || "")).map(f => `<tr><td>${dateBR(f.date)}</td><td>${esc(vehicleName(f.vehicleId))}</td><td>${esc(f.fuelType)}</td><td>${esc(f.liters)} L</td><td>${money(f.price)}</td><td>${money(f.total)}</td><td>${f.km ? `${esc(f.km)} km` : "—"}</td><td><button class="text-button danger-text" type="button" data-action="delete" data-kind="fuels" data-id="${esc(f.id)}">Excluir</button></td></tr>`).join("") : emptyRow(8, "Nenhum abastecimento cadastrado.");
    const total = data.fuels.reduce((s,f) => s + Number(f.total || 0), 0);
    const liters = data.fuels.reduce((s,f) => s + Number(f.liters || 0), 0);
    if ($("#fuelTotal")) $("#fuelTotal").textContent = money(total);
    if ($("#fuelLiters")) $("#fuelLiters").textContent = `${liters.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;
  }

  function renderExpenses() {
    const table = $("#expenseTable");

    // Manutenções também são despesas. Elas continuam armazenadas em
    // data.maintenances e são apenas apresentadas junto às despesas comuns,
    // evitando criar lançamentos duplicados ou somar o mesmo valor duas vezes.
    const expenseRows = [
      ...data.expenses.map(e => ({ ...e, recordKind: "expenses", displayCategory: e.category || "Outro" })),
      ...data.maintenances.map(m => ({ ...m, recordKind: "maintenances", displayCategory: "Manutenção" }))
    ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    if (table) table.innerHTML = expenseRows.length ? expenseRows.map(e => `
      <tr>
        <td><strong>${esc(e.title)}</strong>${e.recordKind === "maintenances" ? '<small class="table-subtext">Registrada em Manutenções</small>' : ""}</td>
        <td>${esc(e.displayCategory)}</td>
        <td>${esc(vehicleName(e.vehicleId))}</td>
        <td>${dateBR(e.date)}</td>
        <td>${money(e.cost)}</td>
        <td><button class="text-button danger-text" type="button" data-action="delete" data-kind="${e.recordKind}" data-id="${esc(e.id)}">Excluir</button></td>
      </tr>`).join("") : emptyRow(6, "Nenhuma despesa cadastrada.");

    const totalExpenses = data.expenses.reduce((sum, e) => sum + Number(e.cost || 0), 0);
    const totalMaintenances = data.maintenances.reduce((sum, m) => sum + Number(m.cost || 0), 0);
    const total = totalExpenses + totalMaintenances;

    if ($("#expenseTotal")) $("#expenseTotal").textContent = money(total);
    if ($("#expenseCount")) $("#expenseCount").textContent = expenseRows.length;
  }

  function renderReminders() {
    const list = $("#reminderList");
    const sorted = data.reminders.slice().sort((a,b) => (a.date || "9999").localeCompare(b.date || "9999"));
    if (list) list.innerHTML = sorted.length ? sorted.map(r => {
      const overdue = r.date && r.date < today();
      return `<article class="reminder-card ${overdue ? "overdue" : ""}"><div class="reminder-card-icon"><i data-lucide="calendar-clock"></i></div><div class="reminder-card-content"><h3>${esc(r.title)}</h3><p>${esc(vehicleName(r.vehicleId))}${r.notes ? ` · ${esc(r.notes)}` : ""}</p><div class="reminder-date">${r.date ? dateBR(r.date) : "Data não definida"}${r.km ? ` · ${esc(r.km)} km` : ""}${overdue ? " · Atrasado" : ""}</div></div><button class="text-button danger-text" type="button" data-action="delete" data-kind="reminders" data-id="${esc(r.id)}">Excluir</button></article>`;
    }).join("") : `<div class="empty-state wide"><div class="empty-icon"><i data-lucide="calendar-check"></i></div><strong>Nenhum lembrete cadastrado</strong><p>Crie lembretes para não esquecer os cuidados com seu veículo.</p></div>`;
    const upcoming = data.reminders.filter(r => !r.date || r.date >= today()).length;
    if ($("#statReminders")) $("#statReminders").textContent = upcoming;
    if ($("#reminderCount")) $("#reminderCount").textContent = upcoming;
    const dash = $("#dashboardReminders");
    if (dash) dash.innerHTML = sorted.slice(0, 4).length ? sorted.slice(0, 4).map(r => `<div class="compact-item"><strong>${esc(r.title)}</strong><small>${esc(vehicleName(r.vehicleId))} · ${r.date ? dateBR(r.date) : "Sem data"}</small></div>`).join("") : `<div class="empty-inline">Nenhum lembrete cadastrado.</div>`;
  }

  function renderHistory() {
    const filter = $("#historyVehicleFilter")?.value || "";
    const items = [
      ...data.maintenances.map(x => ({ ...x, kind: "Manutenção", label: x.title, date: x.date, id: `m-${x.id}` })),
      ...data.documents.map(x => ({ ...x, kind: "Documento", label: x.title, date: x.dueDate, id: `d-${x.id}` })),
      ...data.fuels.map(x => ({ ...x, kind: "Abastecimento", label: `${x.fuelType} · ${x.liters} L`, date: x.date, id: `f-${x.id}` })),
      ...data.expenses.map(x => ({ ...x, kind: "Despesa", label: x.title, date: x.date, id: `e-${x.id}` })),
      ...data.reminders.map(x => ({ ...x, kind: "Lembrete", label: x.title, date: x.date, id: `r-${x.id}` }))
    ].filter(x => !filter || x.vehicleId === filter).sort((a,b) => (b.date || "").localeCompare(a.date || ""));
    const timeline = $("#historyTimeline");
    if (timeline) timeline.innerHTML = items.length ? items.map(x => `<article class="timeline-item"><span class="timeline-dot"></span><strong>${esc(x.label)}</strong><p>${esc(x.kind)} · ${esc(vehicleName(x.vehicleId))}</p><small>${dateBR(x.date)}${x.cost || x.total ? ` · ${money(x.cost || x.total)}` : ""}</small></article>`).join("") : `<div class="empty-inline">Nenhum registro para este filtro.</div>`;
  }

  function renderDashboard() {
    const totalCosts = data.expenses.reduce((s,x) => s + Number(x.cost || 0), 0) + data.maintenances.reduce((s,x) => s + Number(x.cost || 0), 0) + data.fuels.reduce((s,x) => s + Number(x.total || 0), 0);
    if ($("#statExpenses")) $("#statExpenses").textContent = money(totalCosts);
    if ($("#dashboardSpending")) $("#dashboardSpending").textContent = money(totalCosts);
    const filter = $("#dashboardVehicleSelect")?.value || "";
    const activity = [
      ...data.maintenances.map(x => ({ ...x, kind: "Manutenção", label: x.title, date: x.date })),
      ...data.documents.map(x => ({ ...x, kind: "Documento", label: x.title, date: x.dueDate })),
      ...data.fuels.map(x => ({ ...x, kind: "Abastecimento", label: `${x.fuelType} · ${x.liters} L`, date: x.date })),
      ...data.expenses.map(x => ({ ...x, kind: "Despesa", label: x.title, date: x.date }))
    ].filter(x => !filter || x.vehicleId === filter).sort((a,b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
    const box = $("#dashboardActivity");
    if (box) box.innerHTML = activity.length ? activity.map(x => `<div class="activity-item"><span class="activity-icon"><i data-lucide="clipboard-list"></i></span><div class="activity-info"><strong>${esc(x.label)}</strong><small>${esc(x.kind)} · ${dateBR(x.date)}</small></div><span class="activity-value">${x.cost || x.total ? money(x.cost || x.total) : ""}</span></div>`).join("") : `<div class="empty-inline">Suas atividades aparecerão aqui.</div>`;
  }

  function renderAll() {
    renderVehicles(); renderMaintenances(); renderDocuments(); renderFuel(); renderExpenses(); renderReminders(); renderHistory(); renderDashboard();
    if ($("#currentYear")) $("#currentYear").textContent = new Date().getFullYear();
    if (window.lucide) window.lucide.createIcons();
  }

  function formObject(form) {
    const obj = Object.fromEntries(new FormData(form).entries());
    Object.keys(obj).forEach(key => { if (typeof obj[key] === "string") obj[key] = obj[key].trim(); });
    return obj;
  }

  function handleVehicle(form) {
    const v = formObject(form);
    if (!v.nickname || !v.brand || !v.model) return toast("Preencha identificação, marca e modelo.", "error");
    data.vehicles.push({ id: uid(), ...v });
    if (!persist()) { data.vehicles.pop(); return; }
    form.reset(); closeModal($("#vehicleModal")); renderAll(); toast("Veículo cadastrado com sucesso!");
  }

  function handleMaintenance(form) {
    const m = formObject(form);
    if (!data.vehicles.some(v => v.id === m.vehicleId)) return toast("Selecione um veículo válido.", "error");
    if (!m.title || !m.date) return toast("Informe o serviço e a data.", "error");
    const record = { id: uid(), ...m };
    data.maintenances.push(record);
    let generatedReminder = null;
    if (m.nextDate || m.nextKm) {
      generatedReminder = { id: uid(), vehicleId: m.vehicleId, title: `Próxima manutenção: ${m.title}`, date: m.nextDate || "", km: m.nextKm || "", notes: "Lembrete criado automaticamente a partir do registro de manutenção.", sourceMaintenanceId: record.id };
      data.reminders.push(generatedReminder);
    }
    if (!persist()) { data.maintenances.pop(); if (generatedReminder) data.reminders.pop(); return; }
    form.reset(); closeModal($("#maintenanceModal")); renderAll(); toast("Manutenção registrada!" + (generatedReminder ? " Lembrete da próxima revisão criado." : ""));
  }

  function handleDocument(form) {
    const d = formObject(form);
    if (!data.vehicles.some(v => v.id === d.vehicleId)) return toast("Selecione um veículo válido.", "error");
    if (!d.title) return toast("Informe o nome do documento.", "error");
    const file = $("input[name=file]", form)?.files?.[0];
    if (file && file.size > 1_000_000) return toast("Para este protótipo, selecione arquivos de até 1 MB.", "error");
    const save = file => {
      const record = { id: uid(), vehicleId: d.vehicleId, type: d.type, title: d.title, dueDate: d.dueDate, notes: d.notes, fileName: file?.name || "", fileData: file?.data || "" };
      data.documents.push(record);
      if (!persist()) { data.documents.pop(); return; }
      form.reset(); closeModal($("#documentModal")); renderAll(); toast("Documento cadastrado!");
    };
    if (file) {
      const reader = new FileReader();
      reader.onload = () => save({ name: file.name, data: reader.result });
      reader.onerror = () => toast("Não foi possível ler o arquivo.", "error");
      reader.readAsDataURL(file);
    } else save(null);
  }

  function handleFuel(form) {
    const f = formObject(form);
    if (!data.vehicles.some(v => v.id === f.vehicleId)) return toast("Selecione um veículo válido.", "error");
    if (!f.date || !f.liters || !f.total) return toast("Preencha data, litros e valor total.", "error");
    data.fuels.push({ id: uid(), ...f });
    if (!persist()) { data.fuels.pop(); return; }
    form.reset(); closeModal($("#fuelModal")); renderAll(); toast("Abastecimento registrado!");
  }

  function handleExpense(form) {
    const e = formObject(form);
    if (!data.vehicles.some(v => v.id === e.vehicleId)) return toast("Selecione um veículo válido.", "error");
    if (!e.title || !e.date || e.cost === "") return toast("Preencha descrição, data e valor.", "error");
    data.expenses.push({ id: uid(), ...e });
    if (!persist()) { data.expenses.pop(); return; }
    form.reset(); closeModal($("#expenseModal")); renderAll(); toast("Despesa cadastrada!");
  }

  function handleReminder(form) {
    const r = formObject(form);
    if (!data.vehicles.some(v => v.id === r.vehicleId)) return toast("Selecione um veículo válido.", "error");
    if (!r.title || (!r.date && !r.km)) return toast("Informe o que precisa ser feito e uma data ou quilometragem.", "error");
    data.reminders.push({ id: uid(), ...r });
    if (!persist()) { data.reminders.pop(); return; }
    form.reset(); closeModal($("#reminderModal")); renderAll(); toast("Lembrete criado!");
  }

  document.addEventListener("click", event => {
    const open = event.target.closest("[data-open-modal]");
    if (open) { event.preventDefault(); openModal(open.dataset.openModal); return; }
    const pageButton = event.target.closest("[data-page], [data-page-link]");
    if (pageButton) { event.preventDefault(); showPage(pageButton.dataset.page || pageButton.dataset.pageLink); return; }
    const close = event.target.closest(".close-modal");
    if (close) { closeModal(close.closest(".modal-backdrop")); return; }
    const action = event.target.closest("[data-action]");
    if (action) {
      const { kind, id } = action.dataset;
      if (kind && Array.isArray(data[kind])) {
        const record = data[kind].find(x => x.id === id);
        if (!record) return;
        const label = record.nickname || record.title || "este registro";
        if (!window.confirm(`Deseja excluir ${label}?`)) return;
        data[kind] = data[kind].filter(x => x.id !== id);
        if (kind === "vehicles") {
          const vehicleId = id;
          ["maintenances", "documents", "fuels", "expenses", "reminders"].forEach(key => { data[key] = data[key].filter(x => x.vehicleId !== vehicleId); });
        }
        if (kind === "maintenances") data.reminders = data.reminders.filter(r => r.sourceMaintenanceId !== id);
        persist(); renderAll(); toast("Registro excluído.");
      }
      return;
    }
    if (event.target.classList.contains("modal-backdrop")) closeModal(event.target);
    if (event.target.closest(".brand")) { event.preventDefault(); showPage("dashboard"); }
  });

  document.addEventListener("submit", event => {
    const form = event.target;
    const handlers = { vehicleForm: handleVehicle, maintenanceForm: handleMaintenance, documentForm: handleDocument, fuelForm: handleFuel, expenseForm: handleExpense, reminderForm: handleReminder };
    if (handlers[form.id]) { event.preventDefault(); if (form.reportValidity()) handlers[form.id](form); }
  });

  $("#menuToggle")?.addEventListener("click", () => $("#sidebar")?.classList.toggle("open"));
  $("#topNotifications")?.addEventListener("click", () => showPage("reminders"));
  $(".brand")?.addEventListener("click", event => { event.preventDefault(); showPage("dashboard"); });
  $("#vehicleSearch")?.addEventListener("input", renderVehicles);
  $("#maintenanceSearch")?.addEventListener("input", renderMaintenances);
  $("#maintenanceFilter")?.addEventListener("change", renderMaintenances);
  $("#historyVehicleFilter")?.addEventListener("change", renderHistory);
  $("#dashboardVehicleSelect")?.addEventListener("change", renderDashboard);
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeAllModals(); });

  // Datas padrão nos formulários de registros datados.
  ["maintenanceForm", "fuelForm", "expenseForm"].forEach(id => {
    const input = $(`#${id} input[name=date]`);
    if (input) input.value = today();
  });
  renderAll();
})();
