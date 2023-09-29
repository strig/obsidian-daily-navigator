import moment from 'moment';
import { Plugin, TAbstractFile, View, WorkspaceLeaf, setIcon } from 'obsidian';



export default class DailyNavigatorPlugin extends Plugin {

	async onload() {
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				const activeLeaf = this.app.workspace.getActiveViewOfType(View);
				if (!activeLeaf) {
					return;
				}
				this.addButtonsToLeaf(activeLeaf.leaf);
			})
		);

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf) => {
				this.addButtonsToLeaf(leaf);
			})
		)
		this.addButtonsToAllLeaves();
	}

	addButtonsToAllLeaves() {
		this.app.workspace.iterateAllLeaves((leaf) => this.addButtonsToLeaf(leaf));
	}

	getDailyNotePlugin() {
		// @ts-ignore
		let plugins = this.app.internalPlugins;
		if (!plugins) return null;
		let daily_note_plugin = plugins.getPluginById("daily-notes");
		if (daily_note_plugin && daily_note_plugin.enabled) {
			return daily_note_plugin
		}
		return null
	}

	getDailyNoteFolder() {
		let daily_note_plugin = this.getDailyNotePlugin();
		if (daily_note_plugin) {
			return daily_note_plugin.instance.options.folder
		}
	}

	getDailyNoteFormat() {
		let daily_note_plugin = this.getDailyNotePlugin();
		if (daily_note_plugin) {
			return daily_note_plugin.instance.options.format
		}
	}

	isFileDailyNote(file: TAbstractFile) {
		let daily_note_folder = this.getDailyNoteFolder();
		let file_in_daily_folder = file.path.startsWith(daily_note_folder);
		let format_path = file.path.replace(daily_note_folder + "/", "").replace(".md", "");
		let moment_obj = moment(format_path, this.getDailyNoteFormat(), true);
		let file_is_daily_format = moment_obj.isValid();
		return file_in_daily_folder && file_is_daily_format
	}

	handleNav(evt: Event, target: String, leaf: WorkspaceLeaf) {
		let [prev_note, next_note] = this.getPrevAndNextDailyNotes();
		if (target === "next" && next_note) {
			leaf.openFile(next_note);
		} else if (target === "prev" && prev_note) {
			leaf.openFile(prev_note);
		}
	}

	getPrevAndNextDailyNotes() {
		let current_file = this.app.workspace.getActiveFile();
		if (!current_file) return [null, null];

		let prev_note = null;
		let next_note = null;
		let daily_notes = this.app.vault.getFiles().filter(file => this.isFileDailyNote(file));

		daily_notes.sort((a, b) => {
			if (a.path === b.path) return 0;
			return a.path > b.path ? -1 : 1
		});

		let current_index = daily_notes.indexOf(current_file);
		if (current_index !== -1 && daily_notes[current_index - 1]) {
			next_note = daily_notes[current_index - 1];
		}
		if (current_index !== -1 && daily_notes[current_index + 1]) {
			prev_note = daily_notes[current_index + 1];
		}
		return [prev_note, next_note]
	}

	addButtonsToLeaf(leaf: WorkspaceLeaf) {

		if (leaf.view.getViewType() !== "markdown") return;

		let file = this.app.workspace.getActiveFile();
		if (!file) return;

		let header = leaf.view.containerEl.getElementsByClassName("view-header")[0];

		if (!header || !header.parentElement) return;

		let subheader_els = header.parentElement.querySelectorAll(".view-sub-header");
		let is_daily_note = this.isFileDailyNote(file);
		if (subheader_els.length >= 1 && !is_daily_note) {
			subheader_els.forEach(el => el.remove())
			return
		}
		console.log(subheader_els);
		let [prev_note, next_note] = this.getPrevAndNextDailyNotes();
		if (subheader_els.length == 0 && is_daily_note) {
			let subheader = document.createElement("div");
			subheader.addClass("view-sub-header");

			let prev_button = subheader.createEl("button", { cls: "clickable-icon", attr: { "id": "daily-note-prev-button" } });
			let prev_icon = prev_button.createEl("span", { cls: "daily-note-nav-icon" })
			setIcon(prev_icon, "left-arrow");
			prev_button.createEl("span", { cls: "daily-note-button-text", text: (prev_note ? prev_note.basename : "First Note") });
			subheader.appendChild(prev_button);

			let next_button = subheader.createEl("button", { cls: "clickable-icon", attr: { "id": "daily-note-next-button" } });
			next_button.createEl("span", { cls: "daily-note-button-text", text: (next_note ? next_note.basename : "First Note") });
			subheader.appendChild(next_button);
			let next_icon = next_button.createEl("span", { cls: "daily-note-nav-icon" });
			setIcon(next_icon, "right-arrow");

			subheader.appendChild(next_button);


			next_button.addEventListener("click", (e) => { this.handleNav(e, "next", leaf) });
			prev_button.addEventListener("click", (e) => { this.handleNav(e, "prev", leaf) });

			header.insertAdjacentElement('afterend', subheader);
		} else if (is_daily_note) {
			const subheader = subheader_els[0];
			let next_button = subheader.querySelector(".view-sub-header #daily-note-next-button");
			let next_text = next_button?.querySelector(".daily-note-button-text");

			let prev_button = subheader.querySelector(".view-sub-header #daily-note-prev-button");
			let prev_text = prev_button?.querySelector(".daily-note-button-text");

			if (prev_note && prev_button) {
				prev_button.setAttribute("aria-disabled", "false");
				if (prev_text) {
					prev_text.textContent = prev_note.basename;
				}
			} else if (prev_button) {
				prev_button.setAttribute("aria-disabled", "true");
				if (prev_text) {
					prev_text.textContent = "First Note";
				}
			}
			if (next_note && next_button) {
				next_button.setAttribute("aria-disabled", "false");
				if (next_text) {
					next_text.textContent = next_note.basename;
				}
			} else if (next_button) {
				next_button.setAttribute("aria-disabled", "true");
				if (next_text) {
					next_text.textContent = "Last Note";
				}
			}
		}
	}

}
