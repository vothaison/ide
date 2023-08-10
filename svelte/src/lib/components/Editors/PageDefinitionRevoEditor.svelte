<script lang="ts">
    import { RevoGrid } from "@revolist/svelte-datagrid";
    import { defineCustomElements } from "@revolist/revogrid/loader";

    import { stringResKeys } from "$lib/context/StringResKeys";
    import { uiContextKey, type IUiContext } from "$lib/context/UiContext";
    import type { IUiTheme } from "$lib/context/UiTheme";
    import FancyDropdownField from "$lib/controls/FancyDropdownField.svelte";
    import TextField from "$lib/controls/TextField.svelte";
    import FormGroup from "$lib/controls/layout/FormGroup.svelte";
    import FormGroupColumn from "$lib/controls/layout/FormGroupColumn.svelte";
    import Form from "$lib/form-controls/Form.svelte";
    import FormTextField from "$lib/form-controls/TextField.svelte";
    import { FieldDataType, type IDictionary } from "$lib/form/FieldDef";
    import { createFormContext } from "$lib/form/FormContext";
    import { FormDataActionType } from "$lib/form/FormData";
    import type { IFormDef } from "$lib/form/FormDef";
    import { FormModeState } from "$lib/form/FormMode";
    import { FormSerializer } from "$lib/form/FormSerializer";
    import { ListDataActionType, createListDataContext } from "$lib/form/ListData";
    import type { IListDef } from "$lib/form/ListDef";
    import AddIcon from "$lib/icons/AddIcon.svelte";
    import CommentIcon from "$lib/icons/CommentIcon.svelte";
    import DeleteIcon from "$lib/icons/DeleteIcon.svelte";
    import MoveDownIcon from "$lib/icons/MoveDownIcon.svelte";
    import MoveUpIcon from "$lib/icons/MoveUpIcon.svelte";
    import SaveIcon from "$lib/icons/SaveIcon.svelte";
    import { fileSystem } from "$lib/ipc";
    import { getLocatorTypeDropDownOptions } from "$lib/utils/dropdowns";
    import { LocatorType, fileDefFactory } from "rockmelonqa.common";
    import type { IPage, IPageElement } from "rockmelonqa.common/file-defs/pageFile";
    import { createEventDispatcher, getContext, onMount } from "svelte";
    import { v4 as uuidv4 } from "uuid";
    import { AlertDialogButtons, AlertDialogType } from "../Alert";
    import AlertDialog from "../AlertDialog.svelte";
    import { appActionContextKey, type IAppActionContext } from "../Application";
    import CommentTextField from "../CommentTextField.svelte";
    import { combinePath } from "../FileExplorer/Node";
    import IconLinkButton from "../IconLinkButton.svelte";
    import { ListTableCellType } from "../ListTable";
    import ListTable from "../ListTable.svelte";
    import ListTableBodyCell from "../ListTableBodyCell.svelte";
    import ListTableBodyRow from "../ListTableBodyRow.svelte";
    import ListTableHeaderCell from "../ListTableHeaderCell.svelte";
    import PrimaryButton from "../PrimaryButton.svelte";
    import { toTitle } from "./Editor";

    const uiContext = getContext(uiContextKey) as IUiContext;
    const { theme } = uiContext;
    const uiTheme = $theme as IUiTheme;

    export let folderPath: string;
    export let fileName: string;
    $: filePath = combinePath([folderPath, fileName], uiContext.pathSeparator);

    export let contentIndex: number;

    const formDef: IFormDef = {
        fields: {
            id: {
                dataType: FieldDataType.Text,
                dataPath: "id",
                isRequired: true,
            },
            description: {
                dataType: FieldDataType.Text,
                dataPath: "description",
            },
        },
    };
    let formContext = createFormContext("pageDefinitionEditor", formDef, uiContext, FormModeState.Edit);
    let {
        mode: formMode,
        modeDispatch: formModeDispatch,
        data: formData,
        dataDispatch: formDataDispatch,
    } = formContext;

    const listDef: IListDef = {
        fields: {
            id: {
                dataType: FieldDataType.Text,
                dataPath: "id",
            },
            type: {
                dataType: FieldDataType.Text,
                dataPath: "type",
            },
            name: {
                dataType: FieldDataType.Text,
                dataPath: "name",
                maxLength: 200,
            },
            findBy: {
                dataType: FieldDataType.Dropdown,
                dataPath: "findBy",
            },
            locator: {
                dataType: FieldDataType.Text,
                dataPath: "locator",
            },
            description: {
                dataType: FieldDataType.Text,
                dataPath: "description",
            },
            comment: {
                dataType: FieldDataType.Text,
                dataPath: "comment",
            },
        },
    };
    let listDataContext = createListDataContext(listDef, uiContext);
    let { value: listData, dispatch: listDataDispatch } = listDataContext;

    $: title = toTitle(fileName);
    const locatorTypeOptions = getLocatorTypeDropDownOptions(uiContext);

    let deleteDialogType: AlertDialogType = AlertDialogType.None;
    let indexToDelete: number;

    const { registerOnSaveHandler, unregisterOnSaveHandler } = getContext(appActionContextKey) as IAppActionContext;
    const dispatch = createEventDispatcher();

    let focusFieldId = "";

    let grid: RevoGrid;

    onMount(async () => {
        // define webcomponent element in DOM
        defineCustomElements().then(() => {
            // then apply data or rerender
            source = [
                {
                    name: "John",
                    year: 1999,
                },
                {
                    name: "Tim",
                    year: 1980,
                },
                {
                    name: "Vick",
                    year: 1995,
                },
                {
                    name: "Beck",
                    year: 1991,
                },
            ];
            headers = [
                {
                    prop: "name",
                    name: "Name",
                    details: "The name",
                },
                { prop: "year", name: "Year", details: "The year" },
            ];
        });

        let s = grid.getSource();

        console.log("grid source", s);

        // default/empty data
        let model: IPage = fileDefFactory.newPageDefinition();

        // parse file content if any
        const fileContent = await fileSystem.readFile(filePath);
        if (fileContent) {
            model = JSON.parse(fileContent) as IPage;
        }
        console.log("PageDefinitionRevoEditor model", model);
        const serializer = new FormSerializer(uiContext);
        const fieldValues = serializer.deserialize(model, formDef.fields);
        formDataDispatch({ type: FormDataActionType.Load, newValues: fieldValues });

        const items = serializer.deserializeList(model.elements, listDef.fields);
        listDataDispatch({ type: ListDataActionType.SetItems, items: items, hasMoreItems: false });

        registerOnSaveHandler(contentIndex, doSave);

        return () => {
            unregisterOnSaveHandler(contentIndex);
        };
    });

    const handleItemChange = (index: number, key: string, value: any) => {
        const item = { ...$listData.items[index] };
        item[key] = value;

        listDataDispatch({
            type: ListDataActionType.UpdateItem,
            index,
            item,
        });

        dispatchChange();
    };

    const dispatchChange = () => {
        dispatch("change");
    };

    const handleDeleteClick = (index: number) => {
        // Determine if this row has any input.
        // If yes, show confirmation dialog. Otherwise, delete straight away
        if (isEmptyItem($listData.items[index])) {
            doDeleteRow(index);
        } else {
            deleteDialogType = AlertDialogType.Question;
            indexToDelete = index;
        }
    };

    const isEmptyItem = (item: IDictionary) => {
        const ignoredProperties: string[] = ["id", "type"];
        return Object.entries(item)
            .filter(([key, value]) => !ignoredProperties.includes(key))
            .map(([key, value]) => value)
            .every((x) => !x);
    };

    const handleDeleteConfirmation = async (event: any) => {
        if (event.detail.button === "delete") {
            doDeleteRow(indexToDelete);
        }
    };

    const doDeleteRow = (index: number) => {
        listDataDispatch({
            type: ListDataActionType.RemoveItem,
            index: index,
        });

        dispatchChange();
    };

    const handleMoveDownClick = (index: number) => {
        if (index >= 0 && index <= $listData.items.length - 2) {
            listDataDispatch({
                type: ListDataActionType.SwapItems,
                indexA: index,
                indexB: index + 1,
            });

            dispatchChange();
        }
    };

    const handleMoveUpClick = (index: number) => {
        if (index >= 1 && index <= $listData.items.length - 1) {
            listDataDispatch({
                type: ListDataActionType.SwapItems,
                indexA: index,
                indexB: index - 1,
            });

            dispatchChange();
        }
    };

    const handleAddElement = () => {
        focusFieldId = `pageDefinitionEditor_${$listData.items.length}_name_input`;

        listDataDispatch({
            type: ListDataActionType.AppendItems,
            items: [newElement()],
            hasMoreItems: false,
        });

        dispatchChange();
    };
    const handleInsertElement = (index: number) => {
        focusFieldId = `pageDefinitionEditor_${index + 1}_name_input`;

        listDataDispatch({
            type: ListDataActionType.InsertItem,
            item: newElement(),
            index: index + 1,
        });

        dispatchChange();
    };
    const newElement = (): IPageElement => {
        return {
            id: uuidv4(),
            type: "pageElement",
            name: "",
            findBy: undefined,
            locator: "",
            description: "",
        } as IPageElement;
    };

    const handleAddComment = () => {
        focusFieldId = `pageDefinitionEditor_${$listData.items.length}_comment_input`;

        listDataDispatch({
            type: ListDataActionType.AppendItems,
            items: [{ id: uuidv4(), type: "comment", comment: "" } as IPageElement],
            hasMoreItems: false,
        });

        dispatchChange();
    };
    const handleInsertComment = (index: number) => {
        focusFieldId = `pageDefinitionEditor_${index + 1}_comment_input`;

        listDataDispatch({
            type: ListDataActionType.InsertItem,
            item: newComment(),
            index: index + 1,
        });

        dispatchChange();
    };
    const newComment = (): IPageElement => {
        return { id: uuidv4(), type: "comment", comment: "" } as IPageElement;
    };

    const isComment = (item: IDictionary) => {
        return (item as IPageElement).type === "comment";
    };

    const handleSave = async () => {
        await doSave();
    };

    const doSave = async (): Promise<boolean> => {
        console.log("source", source);
        if (isDataValid) {
            const serializer = new FormSerializer(uiContext);
            const model = serializer.serialize($formData.values, formDef.fields);

            const items = $listData.items.filter((r) => !isEmptyItem(r));
            const elements = serializer.serializeList(items, listDef.fields);
            const data = { ...model, elements };
            await fileSystem.writeFile(filePath, JSON.stringify(data, null, 4));

            dispatch("saved");
            return true;
        }

        formDataDispatch({ type: FormDataActionType.ShowAllErrors });
        return false;
    };

    const isElementNameValid = (elementName: string) => {
        if (elementName) {
            const regex = /^[A-Za-z0-9]+$/;
            return regex.test(elementName);
        }

        return true;
    };
    $: isListDataValid = $listData.items.every((item) => isElementNameValid(item.name));
    $: isDataValid = $formData.isValid && isListDataValid;

    let source: any[];
    let headers: any[];
</script>

<div class="flex items-center gap-x-2">
    <div class="ml-auto">
        <PrimaryButton on:click={handleSave} disabled={!isDataValid}>
            <span class="flex items-center gap-x-2">
                <SaveIcon class="w-5 h-5" />
                {uiContext.str(stringResKeys.general.save)}
            </span>
        </PrimaryButton>
    </div>
</div>
<RevoGrid bind:this={grid} {source} resize="true" columns={headers} theme="material" />

<AlertDialog
    id="dialogDeleteRow"
    bind:type={deleteDialogType}
    buttons={AlertDialogButtons.DeleteCancel}
    on:click={handleDeleteConfirmation}
>
    <div slot="title">{uiContext.str(stringResKeys.general.confirmation)}</div>
    <div slot="content">{uiContext.str(stringResKeys.pageDefinitionEditor.deleteRowConfirmation)}</div>
</AlertDialog>
