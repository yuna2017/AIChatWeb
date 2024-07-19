import { useDebouncedCallback } from "use-debounce";
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  Fragment,
  Dispatch,
  SetStateAction,
} from "react";

import SendWhiteIcon from "../icons/send-white.svg";
import BrainIcon from "../icons/brain.svg";
import PollIcon from "../icons/poll.svg";
import RenameIcon from "../icons/rename.svg";
import UserIcon from "../icons/user.svg";
import CartIcon from "../icons/cart-outline.svg";
import ExportIcon from "../icons/share.svg";
import ReturnIcon from "../icons/return.svg";
import CopyIcon from "../icons/copy.svg";
import LoadingIcon from "../icons/three-dots.svg";
import PromptIcon from "../icons/prompt.svg";
import MaskIcon from "../icons/app.svg";
import CloseIcon from "../icons/close.svg";
// import InternetIcon from "../icons/internet.svg";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";
import ResetIcon from "../icons/reload.svg";
import BreakIcon from "../icons/break.svg";
import SettingsIcon from "../icons/chat-settings.svg";
import DeleteIcon from "../icons/clear.svg";
import PinIcon from "../icons/pin.svg";
import EditIcon from "../icons/rename.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CancelIcon from "../icons/cancel.svg";
import MenuIcon from "../icons/boldmenu.svg";

import LightIcon from "../icons/light.svg";
import DarkIcon from "../icons/dark.svg";
import AutoIcon from "../icons/auto.svg";
import BottomIcon from "../icons/bottom.svg";
import StopIcon from "../icons/pause.svg";
import RobotIcon from "../icons/robot.svg";
import Internet from "../icons/internetsearch.svg";
import HorizontalIcon from "../icons/horizontal.svg";
import VerticalIcon from "../icons/vertical.svg";
import PanLeftIcon from "../icons/pan-left.svg";
import PanRightIcon from "../icons/pan-right.svg";
import PanUpIcon from "../icons/pan-up.svg";
import PanDownIcon from "../icons/pan-down.svg";
import UploadIcon from "../icons/upload.svg";
import CheckmarkIcon from "../icons/checkmark.svg";

import {
  ChatMessage,
  SubmitKey,
  useChatStore,
  BOT_HELLO,
  createMessage,
  useAuthStore,
  useAccessStore,
  Theme,
  useAppConfig,
  DEFAULT_TOPIC,
  ModelType,
  AiPlugin,
  PluginActionModel,
  SimpleModel,
  ModelMessageStruct,
  ModelContentType,
  ChatSession,
  BaseImageItem,
  FileEntity,
  ImageMode,
  AiAssistant,
} from "../store";

import {
  copyToClipboard,
  selectOrCopy,
  autoGrowTextArea,
  useMobileScreen,
  fromYYYYMMDD_HHMMSS,
} from "../utils";

import dynamic from "next/dynamic";

import { ChatControllerPool } from "../client/controller";
import { Prompt, usePromptStore } from "../store/prompt";
import Locale from "../locales";

import { IconButton } from "./button";
import styles from "./chat.module.scss";

import {
  List,
  ListItem,
  Modal,
  Selector,
  showConfirm,
  showPowerfulConfirm,
  showPrompt,
  showToast,
} from "./ui-lib";
import { useNavigate } from "react-router-dom";
import {
  CHAT_PAGE_SIZE,
  LAST_INPUT_KEY,
  Path,
  REQUEST_TIMEOUT_MS,
  SPEED_MAP,
  SPEED_MAP_KEY,
  UNFINISHED_INPUT,
} from "../constant";
import { Avatar } from "./emoji";
import { ContextPrompts, MaskAvatar, MaskConfig } from "./mask";
import { Mask, useMaskStore } from "../store/mask";
import { ChatCommandPrefix, useChatCommand, useCommand } from "../command";
import { prettyObject } from "../utils/format";
import { ExportMessageModal } from "./exporter";
import { getClientConfig } from "../config/client";
import { useWebsiteConfigStore } from "../store";
import { nanoid } from "nanoid";

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

const MAX_IMAGE_SIZE = 5;

export function SessionConfigModel(props: {
  session: ChatSession;
  onClose: () => void;
}) {
  const chatStore = useChatStore();
  //const session = chatStore.currentSession();
  const maskStore = useMaskStore();
  const authStore = useAuthStore();
  const navigate = useNavigate();

  console.log("props.session.mask", props.session.mask);
  const [mask, setMask] = useState(
    JSON.parse(JSON.stringify(props.session.mask)) as Mask,
  );
  const [changed, setChanged] = useState(false);

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Context.Edit}
        onClose={async () => {
          console.log("changed", changed);
          if (changed) {
            if (
              await showPowerfulConfirm({
                content: Locale.Memory.CloseConfirm,
                confirmText: Locale.Memory.ConfirmText,
              })
            ) {
              props.onClose();
            }
          } else {
            props.onClose();
          }
        }}
        actions={[
          <IconButton
            key="reset"
            icon={<ResetIcon />}
            bordered
            text={Locale.Chat.Config.Reset}
            onClick={async () => {
              if (await showConfirm(Locale.Memory.ResetConfirm)) {
                chatStore.clearCurrentSessionMemoryPrompt(
                  authStore.token,
                  () => {
                    authStore.logout();
                    navigate(Path.Login);
                  },
                );
              }
            }}
          />,
          <IconButton
            key="copy"
            icon={<CopyIcon />}
            bordered
            text={Locale.Chat.Config.SaveAs}
            onClick={() => {
              navigate(Path.Masks);
              setTimeout(() => {
                maskStore.create(props.session.mask);
              }, 500);
            }}
          />,
          <IconButton
            key="confirm"
            icon={<CopyIcon />}
            bordered
            type="primary"
            text={Locale.Chat.Config.Confirm}
            onClick={async () => {
              // console.log('confirm', mask)
              const result = await chatStore.updateCurrentSessionMask(
                mask,
                authStore.token,
                () => {
                  authStore.logout();
                  navigate(Path.Login);
                },
              );
              if (result) {
                props.onClose();
              }
            }}
          />,
        ]}
      >
        <MaskConfig
          mask={mask}
          updateMask={(updater) => {
            // const mask = { ...session.mask };
            updater(mask);
            setMask({ ...mask });
            console.log("update mask, set changed=true", mask);
            setChanged(true);
            // chatStore.updateCurrentSession((session) => (session.mask = mask));
          }}
          shouldSyncFromGlobal
          extraListItems={
            props.session.mask.modelConfig.sendMemory ? (
              <ListItem
                className="copyable"
                title={`${Locale.Memory.Title} (${props.session.lastSummarizeIndex} of ${props.session.messages.length})`}
                subTitle={
                  props.session.memoryPrompt || Locale.Memory.EmptyContent
                }
              ></ListItem>
            ) : (
              <></>
            )
          }
        ></MaskConfig>
      </Modal>
    </div>
  );
}

function PromptToast(props: {
  showToast?: boolean;
  showModal?: boolean;
  setShowModal: (_: boolean) => void;
}) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const context = session.mask.context;

  return (
    <div className={styles["prompt-toast"]} key="prompt-toast">
      {props.showToast && (
        <div
          className={styles["prompt-toast-inner"] + " clickable"}
          role="button"
          onClick={() => props.setShowModal(true)}
        >
          <BrainIcon />
          <span className={styles["prompt-toast-content"]}>
            {Locale.Context.Toast(context.length)}
          </span>
        </div>
      )}
      {props.showModal && (
        <SessionConfigModel
          session={session}
          onClose={() => props.setShowModal(false)}
        />
      )}
    </div>
  );
}

function useSubmitHandler() {
  const config = useAppConfig();
  const submitKey = config.submitKey;
  const isComposing = useRef(false);

  useEffect(() => {
    const onCompositionStart = () => {
      isComposing.current = true;
    };
    const onCompositionEnd = () => {
      isComposing.current = false;
    };

    window.addEventListener("compositionstart", onCompositionStart);
    window.addEventListener("compositionend", onCompositionEnd);

    return () => {
      window.removeEventListener("compositionstart", onCompositionStart);
      window.removeEventListener("compositionend", onCompositionEnd);
    };
  }, []);

  const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return false;
    if (e.key === "Enter" && (e.nativeEvent.isComposing || isComposing.current))
      return false;
    return (
      (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
      (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
      (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
      (config.submitKey === SubmitKey.MetaEnter && e.metaKey) ||
      (config.submitKey === SubmitKey.Enter &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.metaKey)
    );
  };

  return {
    submitKey,
    shouldSubmit,
  };
}

export type RenderPrompt = Pick<Prompt, "title" | "content">;

export function PromptHints(props: {
  prompts: RenderPrompt[];
  onPromptSelect: (prompt: RenderPrompt) => void;
}) {
  const noPrompts = props.prompts.length === 0;
  const [selectIndex, setSelectIndex] = useState(0);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectIndex(0);
  }, [props.prompts.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (noPrompts || e.metaKey || e.altKey || e.ctrlKey) {
        return;
      }
      // arrow up / down to select prompt
      const changeIndex = (delta: number) => {
        e.stopPropagation();
        e.preventDefault();
        const nextIndex = Math.max(
          0,
          Math.min(props.prompts.length - 1, selectIndex + delta),
        );
        setSelectIndex(nextIndex);
        selectedRef.current?.scrollIntoView({
          block: "center",
        });
      };

      if (e.key === "ArrowUp") {
        changeIndex(1);
      } else if (e.key === "ArrowDown") {
        changeIndex(-1);
      } else if (e.key === "Enter") {
        const selectedPrompt = props.prompts.at(selectIndex);
        if (selectedPrompt) {
          props.onPromptSelect(selectedPrompt);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.prompts.length, selectIndex]);

  if (noPrompts) return null;
  return (
    <div className={styles["prompt-hints"]}>
      {props.prompts.map((prompt, i) => (
        <div
          ref={i === selectIndex ? selectedRef : null}
          className={
            styles["prompt-hint"] +
            ` ${i === selectIndex ? styles["prompt-hint-selected"] : ""}`
          }
          key={prompt.title + i.toString()}
          onClick={() => props.onPromptSelect(prompt)}
          onMouseEnter={() => setSelectIndex(i)}
        >
          <div className={styles["hint-title"]}>{prompt.title}</div>
          <div className={styles["hint-content"]}>{prompt.content}</div>
        </div>
      ))}
    </div>
  );
}

function ClearContextDivider() {
  const authStore = useAuthStore();
  const navigate = useNavigate();
  const chatStore = useChatStore();

  return (
    <div
      className={styles["clear-context"]}
      onClick={() => {
        chatStore.updateCurrentSessionClearContextIndex(authStore.token, () => {
          authStore.logout();
          navigate(Path.Login);
        });
        // chatStore.updateCurrentSession(
        //   (session) => (session.clearContextIndex = undefined),
        // )
      }}
    >
      <div className={styles["clear-context-tips"]}>{Locale.Context.Clear}</div>
      <div className={styles["clear-context-revert-btn"]}>
        {Locale.Context.Revert}
      </div>
    </div>
  );
}

const ChatAction = React.forwardRef(
  (
    props: {
      text: string;
      icon: JSX.Element;
      alwaysShowText?: boolean;
      onClick: () => void;
    },
    ref,
  ) => {
    const iconRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState({
      full: 16,
      icon: 16,
    });

    function updateWidth() {
      if (!iconRef.current || !textRef.current) return;
      const getWidth = (dom: HTMLDivElement) =>
        dom.getBoundingClientRect().width;
      const textWidth = getWidth(textRef.current);
      const iconWidth = getWidth(iconRef.current);
      const newWidth = {
        full: textWidth + iconWidth,
        icon: iconWidth,
      };
      setWidth(newWidth);
    }
    useEffect(() => {
      if (props.alwaysShowText) {
        setTimeout(updateWidth, 1);
      }
    }, []);

    React.useImperativeHandle(ref, () => ({
      updateWidth,
    }));

    return (
      <div
        className={`${styles["chat-input-action"]} clickable ${
          props.alwaysShowText ? styles["hover"] : ""
        }`}
        onClick={() => {
          props.onClick();
          setTimeout(updateWidth, 1);
        }}
        onMouseEnter={updateWidth}
        onTouchStart={updateWidth}
        style={
          {
            "--icon-width": `${width.icon}px`,
            "--full-width": `${width.full}px`,
          } as React.CSSProperties
        }
      >
        <div ref={iconRef} className={styles["icon"]}>
          {props.icon}
        </div>
        <div ref={textRef} className={styles["text"]}>
          {props.text}
        </div>
      </div>
    );
  },
);
ChatAction.displayName = "ChatAction";

const SwitchChatAction = React.forwardRef(
  (
    props: {
      text: string;
      icon?: JSX.Element;
      value?: boolean;
      alwaysShowText?: boolean;
      onClick: () => void;
    },
    ref,
  ) => {
    const iconRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState({
      full: 16,
      icon: props.icon ? 16 : 0,
    });
    const [isClicked, setIsClicked] = useState(props.value ?? false); // 新增state

    function updateWidth() {
      if (!iconRef.current || !textRef.current) return;
      const getWidth = (dom: HTMLDivElement) =>
        dom.getBoundingClientRect().width;
      const textWidth = getWidth(textRef.current);
      const iconWidth = getWidth(iconRef.current);
      setWidth({
        full: textWidth + iconWidth,
        icon: iconWidth,
      });
    }
    useEffect(() => {
      if (props.alwaysShowText) {
        setTimeout(updateWidth, 1);
      }
    }, []);

    return (
      <div
        className={`${styles["chat-input-action"]} clickable ${
          props.alwaysShowText ? styles["hover"] : ""
        }`}
        onClick={() => {
          props.onClick();
          setIsClicked(!isClicked); // 更新isClicked的状态
          setTimeout(updateWidth, 1);
        }}
        onMouseEnter={updateWidth}
        onTouchStart={updateWidth}
        style={
          {
            "--icon-width": `${width.icon}px`,
            "--full-width": `${width.full}px`,
            backgroundColor: isClicked ? "#dafbe1" : "", // 根据isClicked的状态设置背景颜色
          } as React.CSSProperties
        }
      >
        {props.icon && (
          <div ref={iconRef} className={styles["icon"]}>
            {props.icon}
          </div>
        )}
        <div className={styles["text"]} ref={textRef}>
          {props.text}
        </div>
      </div>
    );
  },
);
SwitchChatAction.displayName = "SwitchChatAction";

function useScrollToBottom() {
  // for auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  function scrollDomToBottom() {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }

  // auto scroll
  useEffect(() => {
    if (autoScroll) {
      scrollDomToBottom();
    }
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
}

export function ChatActions(props: {
  showPromptModal: () => void;
  scrollToBottom: () => void;
  showPromptHints: () => void;
  imageSelected: (img: BaseImageItem) => void;
  beforeSelectImages: () => boolean;
  hitBottom: boolean;
  plugins: PluginActionModel[];
  togglePlugin: (
    plugin: PluginActionModel,
  ) => Promise<{ result: boolean; value: boolean }>;
  contentType: ModelContentType;
  messageStruct: ModelMessageStruct;
  processModes: SPEED_MAP_KEY[];
  selectedProcessMode: SPEED_MAP_KEY | null;
  toggleProcessMode: (processMode: SPEED_MAP_KEY) => void;
  uploading: boolean;
  setUploading: React.Dispatch<React.SetStateAction<boolean>>;
  assistant?: AiAssistant;
}) {
  const config = useAppConfig();
  const navigate = useNavigate();
  const chatStore = useChatStore();
  const authStore = useAuthStore();
  const { availableModels } = useWebsiteConfigStore();

  // switch themes
  const theme = config.theme;
  function nextTheme() {
    const themes = [Theme.Auto, Theme.Light, Theme.Dark];
    const themeIndex = themes.indexOf(theme);
    const nextIndex = (themeIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    config.update((config) => (config.theme = nextTheme));
  }

  // stop all responses
  const couldStop = ChatControllerPool.hasPending();
  const stopAll = () => ChatControllerPool.stopAll();

  // switch model
  const currentModel = {
    name: chatStore.currentSession().mask.modelConfig.model,
    avatarEmoji: chatStore.currentSession().mask.modelConfig.avatarEmoji,
    avatarFileUuid: chatStore.currentSession().mask.modelConfig.avatarFileUuid,
    contentType: chatStore.currentSession().mask.modelConfig.contentType,
    messageStruct: chatStore.currentSession().mask.modelConfig.messageStruct,
    processModes: chatStore.currentSession().mask.modelConfig.processModes,
    processMode: chatStore.currentSession().mask.modelConfig.processMode,
    drawActions: chatStore.currentSession().mask.modelConfig.drawActions,
  } as SimpleModel;

  const [showModelSelector, setShowModelSelector] = useState(false);

  function selectImage() {
    if (!props.beforeSelectImages()) {
      return;
    }
    document.getElementById("chat-image-file-select-upload")?.click();
  }

  const uploadFile = (file: any) => {
    props.setUploading(true);
    const url = "/file/put";
    const BASE_URL = process.env.BASE_URL;
    const mode = process.env.BUILD_MODE;
    let requestUrl = (mode === "export" ? BASE_URL : "") + "/api" + url;
    const formData = new FormData();
    formData.append("usage", "chat");
    formData.append("file", file);
    if (props.assistant) {
      formData.append("assistantUuid", props.assistant!.uuid);
    }
    return fetch(requestUrl, {
      method: "post",
      headers: {
        // 'Content-Type': 'multipart/form-data',
        Authorization: "Bearer " + authStore.token,
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.code === 413) {
          showToast(res.cnMessage || res.message, undefined, 5000);
          if (Math.floor(res.code / 100) === 100) {
            // 100XX
            authStore.logout();
            navigate(Path.Login);
          }
        }
        return res;
      })
      .catch((e) => {
        console.error(e);
        showToast("上传失败！" + e);
      })
      .finally(() => {
        console.log("finally");
        props.setUploading(false);
      });
  };
  const onImageSelected = (e: any) => {
    const file = e.target.files[0];
    uploadFile(file).then((res) => {
      if (res.code !== 0) {
        showToast(res.cnMessage || res.message, undefined, 5000);
        if (Math.floor(res.code / 100) === 100) {
          // 100XX
          authStore.logout();
          navigate(Path.Login);
        }
        return;
      }
      const filename = file.name;
      const fileEntity = res.data as FileEntity;
      props.imageSelected({
        filename,
        uuid: fileEntity.uuid,
        url: fileEntity.url.startsWith("/")
          ? "/api" + fileEntity.url
          : fileEntity.url,
        entity: fileEntity,
        assistantUuid: fileEntity.assistantUuid,
        thirdpartId: fileEntity.thirdpartId,
      });
    });
    e.target.value = null;
  };

  const modelSelectorRef = useRef(null);

  return (
    <div className={styles["chat-input-actions"]}>
      {couldStop && (
        <ChatAction
          onClick={stopAll}
          text={Locale.Chat.InputActions.Stop}
          icon={<StopIcon />}
        />
      )}
      {!props.hitBottom && (
        <ChatAction
          onClick={props.scrollToBottom}
          text={Locale.Chat.InputActions.ToBottom}
          icon={<BottomIcon />}
        />
      )}
      {props.hitBottom && (
        <ChatAction
          onClick={props.showPromptModal}
          text={Locale.Chat.InputActions.Settings}
          icon={<SettingsIcon />}
        />
      )}

      <div className={styles["hide-on-mobile"]}>
        <ChatAction
          onClick={nextTheme}
          text={Locale.Chat.InputActions.Theme[theme]}
          icon={
            <>
              {theme === Theme.Auto ? (
                <AutoIcon />
              ) : theme === Theme.Light ? (
                <LightIcon />
              ) : theme === Theme.Dark ? (
                <DarkIcon />
              ) : null}
            </>
          }
        />
      </div>

      <div className={styles["hide-on-mobile"]}>
        <ChatAction
          onClick={props.showPromptHints}
          text={Locale.Chat.InputActions.Prompt}
          icon={<PromptIcon />}
        />
      </div>

      <div className={styles["hide-on-mobile"]}>
        <ChatAction
          onClick={() => {
            navigate(Path.Masks);
          }}
          text={Locale.Chat.InputActions.Masks}
          icon={<MaskIcon />}
        />
      </div>

      <SwitchChatAction
        text={Locale.Chat.InputActions.Clear}
        icon={<BreakIcon />}
        onClick={() => {
          chatStore.updateCurrentSessionClearContextIndex(
            authStore.token,
            () => {
              authStore.logout();
              navigate(Path.Login);
            },
          );
        }}
      />

      {!props.assistant && (
        <ChatAction
          ref={modelSelectorRef}
          onClick={() => setShowModelSelector(true)}
          text={currentModel.name}
          alwaysShowText={true}
          icon={
            currentModel.avatarEmoji ? (
              <Avatar avatar={currentModel.avatarEmoji} noBorder={true} />
            ) : currentModel.avatarFileUuid ? (
              <Avatar
                logoUrl={"/api/file/" + currentModel.avatarFileUuid}
                noBorder={true}
              />
            ) : (
              <RobotIcon />
            )
          }
        />
      )}

      {showModelSelector && (
        <Selector
          defaultSelectedValue={currentModel.name}
          items={availableModels.map((m) => ({
            title: m.name,
            subTitle: m.desc,
            icon: m.avatarEmoji ? (
              <Avatar avatar={m.avatarEmoji} />
            ) : m.avatarFileUuid ? (
              <Avatar logoUrl={"/api/file/" + m.avatarFileUuid} />
            ) : (
              <></>
            ),
            value: m.name,
          }))}
          onClose={() => setShowModelSelector(false)}
          onSelection={async (s) => {
            if (s.length === 0) return;
            const selectedModel = availableModels.find((m) => m.name === s[0]);
            if (!selectedModel) return;
            const result = await chatStore.updateCurrentSessionMaskByUpdater(
              (mask) => {
                mask.modelConfig.model = selectedModel.name;
                mask.modelConfig.avatarEmoji = selectedModel.avatarEmoji;
                mask.modelConfig.avatarFileUuid = selectedModel.avatarFileUuid;
                mask.modelConfig.contentType = selectedModel.contentType;
                mask.modelConfig.messageStruct = selectedModel.messageStruct;
                mask.modelConfig.processModes = selectedModel.processModes;
                if (selectedModel.processModes.length) {
                  if (
                    selectedModel.processModes.includes(
                      "mixed" as SPEED_MAP_KEY,
                    )
                  ) {
                    mask.modelConfig.processMode = "mixed" as SPEED_MAP_KEY;
                  } else {
                    mask.modelConfig.processMode =
                      selectedModel.processModes[0];
                  }
                } else {
                  mask.modelConfig.processMode = null;
                }
                mask.modelConfig.drawActions = selectedModel.drawActions;
                mask.syncGlobalConfig = false;
              },
              authStore.token,
              () => {
                authStore.logout();
                navigate(Path.Login);
              },
            );
            if (result) {
              showToast(selectedModel.name);
              if (modelSelectorRef.current) {
                // @ts-ignore
                modelSelectorRef.current.updateWidth();
              }
            }
          }}
        />
      )}

      {(props.contentType === "Image" ||
        props.messageStruct === "complex" ||
        props.assistant) && (
        <div
          className={`${styles["chat-input-action"]} clickable`}
          onClick={selectImage}
        >
          <input
            type="file"
            accept={
              props.assistant
                ? ".c,.cpp,.csv,.docx,.html,.java,.json,.md,.pdf,.php,.pptx,.py,.rb,.tex,.txt,.css,.jpeg,.jpg,.js,.gif,.png,.tar,.ts,.xlsx,.xml,.zip'"
                : ".png,.jpg,.webp,.jpeg"
            }
            id="chat-image-file-select-upload"
            style={{ display: "none" }}
            onChange={onImageSelected}
          />
          <UploadIcon />
        </div>
      )}

      <>
        {!props.assistant &&
          props.plugins.map((model) => {
            return (
              <SwitchChatAction
                key={model.plugin.uuid}
                alwaysShowText={true}
                onClick={async () => {
                  const { result, value } = await props.togglePlugin(model);
                  console.log(
                    "toggle plugin result",
                    model.plugin.name,
                    result,
                    value,
                  );
                  if (result) {
                    showToast(
                      (value ? "已开启" : "已关闭") + model.plugin.name,
                    );
                  }
                }}
                text={model.plugin.name}
                icon={<Internet />}
                value={model.value}
              />
            );
          })}
      </>

      <>
        {props.processModes?.length > 0 && (
          <ChatAction
            onClick={() => {
              let index = props.processModes.indexOf(
                props.selectedProcessMode as SPEED_MAP_KEY,
              );
              if (index >= 0) {
                index = (index + 1) % props.processModes.length;
              } else {
                index = 0;
              }
              props.toggleProcessMode(props.processModes[index]);
            }}
            text={SPEED_MAP[props.selectedProcessMode as SPEED_MAP_KEY]}
            alwaysShowText={true}
            icon={<PollIcon />}
          />
        )}
      </>
    </div>
  );
}

export function EditMessageModal(props: {
  onClose: () => void;
  updateTopic: (topic: string) => Promise<boolean>;
  updateMessages: (messages: ChatMessage[]) => Promise<boolean>;
}) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const [messages, setMessages] = useState(session.messages.slice());
  const [topic, setTopic] = useState("");
  useEffect(() => {
    setTopic(session.topic);
  }, [session]);

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Chat.EditMessage.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            text={Locale.UI.Cancel}
            icon={<CancelIcon />}
            key="cancel"
            onClick={() => {
              props.onClose();
            }}
          />,
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={async () => {
              const topicResult = await props.updateTopic(topic);
              if (topicResult) {
                const result = await props.updateMessages(messages);
                if (result) {
                  props.onClose();
                }
              }
            }}
          />,
        ]}
      >
        <List>
          <ListItem
            title={Locale.Chat.EditMessage.Topic.Title}
            subTitle={Locale.Chat.EditMessage.Topic.SubTitle}
          >
            <input
              type="text"
              value={topic}
              onChange={(e) =>
                // chatStore.updateCurrentSession(
                //   (session) => (session.topic = e.currentTarget.value),
                // )
                setTopic(e.currentTarget.value)
              }
            ></input>
          </ListItem>
        </List>
        <ContextPrompts
          context={messages}
          updateContext={(updater) => {
            const newMessages = messages.slice();
            updater(newMessages);
            //console.log("newMessages", newMessages);
            setMessages(newMessages);
          }}
        />
      </Modal>
    </div>
  );
}

function RefreshDrawStatus(props: {
  message: RenderMessage;
  session: ChatSession;
  refreshDrawStatus: (
    session: ChatSession,
    userMessage: ChatMessage | null,
    botMessage: ChatMessage,
  ) => void;
  ChatFetchTaskPool: Map<string, NodeJS.Timeout | null>;
}) {
  const message = props.message;
  const session = props.session;
  const ChatFetchTaskPool = props.ChatFetchTaskPool;

  const [now, SetNow] = useState(+new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      SetNow(+new Date());
    }, 100);

    return () => {
      console.log("clearInterval", interval);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {!ChatFetchTaskPool.get(message.attr?.taskId) &&
        message.attr?.submitTime &&
        now - +fromYYYYMMDD_HHMMSS(message.attr.submitTime) > 1000 && (
          <div>
            <button
              onClick={() => props.refreshDrawStatus(session, null, message)}
              className={`${styles["chat-message-mj-action-btn"]} clickable`}
              style={{ width: "150px" }}
            >
              {Locale.Midjourney.Refresh}
            </button>
          </div>
        )}
    </>
  );
}

type RenderMessage = ChatMessage & { preview?: boolean };

function _Chat(props: {
  setRequestingSession: Dispatch<SetStateAction<ChatSession | null>>;
}) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const fontSize = config.fontSize;

  const [showExport, setShowExport] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userInput, setUserInput] = useState("");
  const [useImages, setUseImages] = useState<BaseImageItem[]>([]);
  const [mjImageMode, setMjImageMode] = useState<ImageMode>(""); // 垫图IMAGINE，混图BLEND，识图DESCRIBE
  const [isLoading, setIsLoading] = useState(false);
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const { scrollRef, setAutoScroll, scrollDomToBottom } = useScrollToBottom();
  const [hitBottom, setHitBottom] = useState(true);
  const isMobileScreen = useMobileScreen();
  const websiteConfigStore = useWebsiteConfigStore();
  const { chatPageSubTitle, logoUrl, plugins } = websiteConfigStore;
  const navigate = useNavigate();

  const authStore = useAuthStore();
  const { availableModels } = useWebsiteConfigStore();

  const [uploading, setUploading] = useState(false);

  // prompt hints
  const promptStore = usePromptStore();
  const [promptHints, setPromptHints] = useState<RenderPrompt[]>([]);
  const onSearch = useDebouncedCallback(
    (text: string) => {
      const matchedPrompts = promptStore.search(text);
      setPromptHints(matchedPrompts);
    },
    100,
    { leading: true, trailing: true },
  );

  // auto grow input
  const [inputRows, setInputRows] = useState(2);
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(
        20,
        Math.max(2 + Number(!isMobileScreen), rows),
      );
      setInputRows(inputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(measure, [userInput]);

  // chat commands shortcuts
  const chatCommands = useChatCommand({
    new: (token: string) =>
      chatStore.newSession(token, () => {
        authStore.logout();
        navigate(Path.Login);
      }),
    newm: () => navigate(Path.NewChat),
    prev: () => chatStore.nextSession(-1),
    next: () => chatStore.nextSession(1),
    clear: () => {
      chatStore.setCurrentSessionClearContextIndex(
        session,
        session.messages.length,
        authStore.token,
        () => {
          authStore.logout();
          navigate(Path.Login);
        },
      );
      // chatStore.updateCurrentSession(
      //   (session) => (session.clearContextIndex = session.messages.length),
      // )
    },
    del: () =>
      chatStore.deleteSession(
        chatStore.currentSessionIndex,
        authStore.token,
        () => {
          authStore.logout();
          navigate(Path.Login);
        },
      ),
  });

  // only search prompts when user input is short
  const SEARCH_TEXT_LIMIT = 30;
  const onInput = (text: string) => {
    setUserInput(text);
    const n = text.trim().length;

    // clear search results
    if (n === 0) {
      setPromptHints([]);
    } else if (text.startsWith(ChatCommandPrefix)) {
      setPromptHints(chatCommands.search(text));
    } else if (!config.disablePromptHint && n < SEARCH_TEXT_LIMIT) {
      // check if need to trigger auto completion
      if (text.startsWith("/")) {
        let searchText = text.slice(1);
        onSearch(searchText);
      }
    }
  };

  const [ChatFetchTaskPool, setChatFetchTaskPool] = useState(
    new Map<string, NodeJS.Timeout | null>(),
  );

  const refreshDrawStatus = (
    session: ChatSession,
    userMessage: ChatMessage | null,
    botMessage: ChatMessage,
  ) => {
    if (ChatFetchTaskPool.get(botMessage.attr.taskId)) {
      return;
    }
    const getDrawTaskProgressAfter3seconds = setTimeout(async () => {
      const fetch = await chatStore.getDrawTaskProgress(
        session,
        userMessage,
        botMessage,
        websiteConfigStore,
        authStore,
        () => {
          authStore.logout();
          navigate(Path.Login);
        },
      );
      ChatFetchTaskPool.set(botMessage.attr.taskId, null);
      if (fetch) {
        refreshDrawStatus(session, userMessage, botMessage);
      }
    }, 3000);
    ChatFetchTaskPool.set(
      botMessage.attr.taskId,
      getDrawTaskProgressAfter3seconds,
    );
    setChatFetchTaskPool(ChatFetchTaskPool);
    // console.log('ChatFetchTaskPool update', ChatFetchTaskPool.get(botMessage.attr.taskId))
  };

  const doSubmit = (userInput: string) => {
    if (useImages.length > 0) {
      if (session.mask?.modelConfig?.contentType === "Image") {
        if (mjImageMode === "IMAGINE") {
          if (!userInput) {
            showToast(Locale.Midjourney.NeedInputUseImgPrompt);
            return;
          }
          if (useImages.length > 1) {
            showToast(Locale.Midjourney.ImagineMaxImg(1));
            return;
          }
        } else if (mjImageMode === "BLEND") {
          if (useImages.length < 2 || useImages.length > MAX_IMAGE_SIZE) {
            showToast(Locale.Midjourney.BlendMinImg(2, MAX_IMAGE_SIZE));
            return;
          }
        } else if (mjImageMode === "DESCRIBE") {
          if (useImages.length > 1) {
            showToast(Locale.Midjourney.DescribeMaxImg(1));
            return;
          }
        }
      } else if (session.mask?.modelConfig?.messageStruct === "complex") {
        if (useImages.length > MAX_IMAGE_SIZE) {
          showToast(Locale.Midjourney.gpt4vMaxImg(MAX_IMAGE_SIZE));
          return;
        }
      }
      // setUserInput(userInput = (mjImageMode + "::" + userInput));
    } else {
      if (userInput.trim() === "") return;
    }
    const matchCommand = chatCommands.match(userInput);
    if (matchCommand.matched) {
      setUserInput("");
      setPromptHints([]);
      setUseImages([]);
      setMjImageMode("");
      matchCommand.invoke();
      return;
    }
    setIsLoading(true);
    props.setRequestingSession(session);
    chatStore
      .onUserInput(
        session,
        userInput,
        pluignModels,
        mjImageMode,
        useImages,
        websiteConfigStore,
        authStore,
        session.mask,
        false,
        authStore.token,
        () => {
          authStore.logout();
          navigate(Path.Login);
        },
        () => props.setRequestingSession(null),
      )
      .then((result) => {
        setIsLoading(false);
        if (result && result.fetch !== undefined) {
          props.setRequestingSession(null);
          if (result.fetch) {
            refreshDrawStatus(session, result.userMessage!, result.botMessage);
          }
        }
      });
    localStorage.setItem(LAST_INPUT_KEY, userInput);
    setUseImages([]);
    setMjImageMode("");
    setUserInput("");
    setPromptHints([]);
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);
  };

  const onPromptSelect = (prompt: RenderPrompt) => {
    setTimeout(() => {
      setPromptHints([]);

      const matchedChatCommand = chatCommands.match(prompt.content);
      if (matchedChatCommand.matched) {
        // if user is selecting a chat command, just trigger it
        matchedChatCommand.invoke();
        setUserInput("");
      } else {
        // or fill the prompt
        setUserInput(prompt.content);
      }
      inputRef.current?.focus();
    }, 30);
  };

  const addBaseImage = (img: BaseImageItem) => {
    if (useImages.length >= MAX_IMAGE_SIZE) {
      showToast(Locale.Midjourney.SelectImgMax(MAX_IMAGE_SIZE));
      return;
    }
    setUseImages([...useImages, img]);
    if (!mjImageMode) {
      setMjImageMode("IMAGINE");
    }
  };

  // stop response
  const onUserStop = (messageId: string) => {
    ChatControllerPool.stop(session.id, messageId);
  };

  const [sessionLoading, setSessionLoading] = useState(false);
  const [isSessionLoadingError, setIsSessionLoadingError] = useState(false);
  const [sessionLoadingError, setSessionLoadingError] = useState(null);

  const reloadSession = () => {
    setSessionLoading(true);
    console.log("session loading = true");
    chatStore
      .refreshSession(session, authStore.token)
      .then(async ({ ok, resp, error }) => {
        if (error) {
          setIsSessionLoadingError(true);
          setSessionLoadingError(error);
          showToast(Locale.Chat.SessionLoadingError(error));
          return;
        }
        setIsSessionLoadingError(false);
        setSessionLoadingError(null);
        if (!ok) {
          if (resp && resp.code === 12302) {
            // 会话已删除
            if (await showConfirm(Locale.Chat.DeleteDeletedSessionConfirm)) {
              chatStore.deleteLocalSession(
                session,
                authStore.token,
                () => {
                  authStore.logout();
                  navigate(Path.Login);
                },
                true,
              );
            }
            return;
          } else {
            console.warn("refresh error");
          }
          return;
        }
        // 更新本地message，如果还在等待输出，那么置为error
        await chatStore.updateCurrentSessionMessagesByUpdater(
          (session) => {
            let messageChanged = false;
            const changedMessages = [] as ChatMessage[];
            const stopTiming = Date.now() - REQUEST_TIMEOUT_MS;
            session.messages.forEach((m) => {
              // check if should stop all stale messages
              if (m.isError || new Date(m.date).getTime() < stopTiming) {
                if (m.streaming) {
                  m.streaming = false;
                  messageChanged = true;
                }

                if ((m.content ?? "").length === 0 && m.role !== "user") {
                  m.isError = true;
                  m.content = prettyObject({
                    error: true,
                    message: "empty response",
                  });
                  messageChanged = true;
                }
                if (messageChanged) {
                  changedMessages.push(m);
                }
              }
            });
            return {
              messageChanged,
              messages: changedMessages,
            };
          },
          authStore.token,
          () => {
            authStore.logout();
            navigate(Path.Login);
          },
        );
        await chatStore.updateCurrentSessionMaskByUpdater(
          (mask) => {
            if (session.mask.syncGlobalConfig) {
              console.log("session.mask.syncGlobalConfig is true");
              const v1 = JSON.stringify(config.modelConfig);
              const v2 = JSON.stringify(session.mask.modelConfig);
              if (v1 === v2) {
                console.log(
                  "[Mask] same with global, not sync",
                  session.mask.name,
                );
                return false;
              }
              console.log(
                "[Mask] syncing from global, name = ",
                session.mask.name,
              );
              session.mask.modelConfig = { ...config.modelConfig };
            } else {
              const selectedModel = availableModels.filter(
                (m) => m.name === session.mask.modelConfig.model,
              )[0];
              if (selectedModel) {
                console.log(
                  "session.mask.syncGlobalConfig is false, check contentType, messageStruct, processModes",
                  session.mask.modelConfig,
                  selectedModel,
                );
                let same = true;
                if (
                  session.mask.modelConfig.contentType !=
                  selectedModel.contentType
                ) {
                  console.log(
                    "contentType has been changed, old = ",
                    session.mask.modelConfig.contentType,
                    ", new = ",
                    selectedModel.contentType,
                  );
                  same = false;
                  session.mask.modelConfig.contentType =
                    selectedModel.contentType;
                }
                if (
                  session.mask.modelConfig.messageStruct !=
                  selectedModel.messageStruct
                ) {
                  console.log(
                    "messageStruct has been changed, old = ",
                    session.mask.modelConfig.messageStruct,
                    ", new = ",
                    selectedModel.messageStruct,
                  );
                  same = false;
                  session.mask.modelConfig.messageStruct =
                    selectedModel.messageStruct;
                }
                if (
                  session.mask.modelConfig.avatarEmoji !=
                  selectedModel.avatarEmoji
                ) {
                  console.log(
                    "avatarEmoji has been changed, old = ",
                    session.mask.modelConfig.avatarEmoji,
                    ", new = ",
                    selectedModel.avatarEmoji,
                  );
                  same = false;
                  session.mask.modelConfig.avatarEmoji =
                    selectedModel.avatarEmoji;
                }
                if (
                  session.mask.modelConfig.avatarFileUuid !=
                  selectedModel.avatarFileUuid
                ) {
                  console.log(
                    "avatarFileUuid has been changed, old = ",
                    session.mask.modelConfig.avatarFileUuid,
                    ", new = ",
                    selectedModel.avatarFileUuid,
                  );
                  same = false;
                  session.mask.modelConfig.avatarFileUuid =
                    selectedModel.avatarFileUuid;
                }
                const sameArray = (a: string[], b: string[]) => {
                  if (
                    (a === null || a === undefined) &&
                    (b === null || b === undefined)
                  ) {
                    return true;
                  } else if (
                    a === null ||
                    a === undefined ||
                    b === null ||
                    b === undefined
                  ) {
                    return false;
                  }
                  if (a.length !== b.length) {
                    return false;
                  }
                  for (let i = 0; i < a.length; i++) {
                    if (!b.includes(a[i])) {
                      return false;
                    }
                  }
                  return true;
                };
                if (
                  !sameArray(
                    session.mask.modelConfig.processModes,
                    selectedModel.processModes,
                  )
                ) {
                  console.log(
                    "processModes has been changed, old = ",
                    session.mask.modelConfig.processModes,
                    ", new = ",
                    selectedModel.processModes,
                  );
                  session.mask.modelConfig.processModes =
                    selectedModel.processModes
                      ? [...selectedModel.processModes]
                      : selectedModel.processModes;
                  session.mask.modelConfig.processMode =
                    selectedModel.processModes &&
                    selectedModel.processModes.length
                      ? selectedModel.processModes[0]
                      : null;
                  same = false;
                }
                if (same) {
                  console.log(
                    "[Mask] same with global, not sync",
                    session.mask.name,
                  );
                  return false;
                }

                console.log(
                  "[Mask] syncing from global, name = ",
                  session.mask.name,
                );
                // session.mask.modelConfig = { ...config.modelConfig };
              } else {
                // selectedModel 不存在
                showToast(Locale.Chat.ModelNotAvailable);
                return false;
              }
            }
          },
          authStore.token,
          () => {
            authStore.logout();
            navigate(Path.Login);
          },
        );
      })
      .finally(() => {
        console.log("session loading = false");
        setSessionLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  useEffect(() => {
    reloadSession();
  }, []);

  const [pluignModels, setPluginModels] = useState<PluginActionModel[]>([]);
  useEffect(() => {
    const pluginUuids = session.mask.modelConfig.pluginUuids || [];
    const models = (plugins || []).map((plugin) => {
      return {
        plugin: plugin,
        value: pluginUuids.includes(plugin.uuid),
      } as PluginActionModel;
    });
    // console.log('plugins', models)
    setPluginModels(models);
  }, []);

  // check if should send message
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // if ArrowUp and no userInput, fill with last input
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(localStorage.getItem(LAST_INPUT_KEY) ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e) && promptHints.length === 0) {
      doSubmit(userInput);
      e.preventDefault();
    }
  };
  const onRightClick = (e: any, message: ChatMessage) => {
    // copy to clipboard
    if (selectOrCopy(e.currentTarget, message.content)) {
      if (userInput.length === 0) {
        setUserInput(message.content);
      }

      e.preventDefault();
    }
  };

  const deleteMessage = (message?: ChatMessage) => {
    if (!message) {
      return;
    }
    chatStore.deleteMessageInCurrentSession(message, authStore.token);
  };

  const onDelete = (message: ChatMessage) => {
    deleteMessage(message);
  };

  const onDeleteContext = (message: ChatMessage) => {
    chatStore.updateCurrentSessionMaskByUpdater(
      (mask) => {
        const index = mask.context.findIndex((m) => message.id === m.id);
        if (index < 0) {
          return false;
        }
        mask.context.splice(index, 1);
        return true;
      },
      authStore.token,
      () => {
        authStore.logout();
        navigate(Path.Login);
      },
    );
  };

  const onResend = (message: ChatMessage) => {
    // when it is resending a message
    // 1. for a user's message, find the next bot response
    // 2. for a bot's message, find the last user's input
    // 3. delete original user input and bot's message
    // 4. resend the user's input

    const resendingIndex = session.messages.findIndex(
      (m) => m.id === message.id,
    );

    if (resendingIndex < 0 || resendingIndex >= session.messages.length) {
      console.error("[Chat] failed to find resending message", message);
      return;
    }

    let userMessage: ChatMessage | undefined;
    let botMessage: ChatMessage | undefined;

    if (message.role === "assistant") {
      // if it is resending a bot's message, find the user input for it
      botMessage = message;
      for (let i = resendingIndex; i >= 0; i -= 1) {
        if (session.messages[i].role === "user") {
          userMessage = session.messages[i];
          break;
        }
      }
    } else if (message.role === "user") {
      // if it is resending a user's input, find the bot's response
      userMessage = message;
      for (let i = resendingIndex; i < session.messages.length; i += 1) {
        if (session.messages[i].role === "assistant") {
          botMessage = session.messages[i];
          break;
        }
      }
    }

    if (userMessage === undefined) {
      console.error("[Chat] failed to resend", message);
      return;
    }

    // delete the original messages
    deleteMessage(userMessage);
    deleteMessage(botMessage);

    // resend the message
    setIsLoading(true);
    props.setRequestingSession(session);
    const content = userMessage.content;
    chatStore
      .onUserInput(
        session,
        content,
        pluignModels,
        userMessage.attr?.imageMode ?? "",
        userMessage.attr?.baseImages || [],
        websiteConfigStore,
        authStore,
        session.mask,
        true,
        authStore.token,
        () => {
          authStore.logout();
          navigate(Path.Login);
        },
        () => props.setRequestingSession(null),
      )
      .then((result) => {
        setIsLoading(false);
        if (result && result.fetch) {
          refreshDrawStatus(session, result.userMessage!, result.botMessage);
        }
      });
    inputRef.current?.focus();
  };

  const onPinMessage = (message: ChatMessage) => {
    chatStore.updateCurrentSessionMaskByUpdater(
      (mask) => {
        // todo
        const copy = {
          ...message,
          id: nanoid(),
        };
        delete copy.uuid;
        mask.context.push(copy);
      },
      authStore.token,
      () => {
        authStore.logout();
        navigate(Path.Login);
      },
    );

    showToast(Locale.Chat.Actions.PinToastContent, {
      text: Locale.Chat.Actions.PinToastAction,
      onClick: () => {
        setShowPromptModal(true);
      },
    });
  };

  const context: RenderMessage[] = (() => {
    return session.mask.hideContext ? [] : session.mask.context.slice();
  })();

  const accessStore = useAccessStore();

  if (
    context.length === 0 &&
    session.messages.at(0)?.content !== BOT_HELLO.content
  ) {
    const copiedHello = Object.assign({}, BOT_HELLO);
    if (!authStore.token) {
      authStore.logout();
      navigate(Path.Login);
      copiedHello.content = Locale.Error.Unauthorized;
    }
    context.push(copiedHello);
  }

  // preview messages
  const lastMessageIsDraw =
    session.messages.length > 0 &&
    session.messages[session.messages.length - 1].role === "assistant" &&
    session.messages[session.messages.length - 1].attr &&
    session.messages[session.messages.length - 1].attr.contentType === "Image";
  const renderMessages = useMemo(() => {
    return context
      .concat(session.messages as RenderMessage[])
      .concat(
        isLoading && !lastMessageIsDraw
          ? [
              {
                ...createMessage({
                  role: "assistant",
                  content: "……",
                }),
                preview: true,
              },
            ]
          : [],
      )
      .concat(
        userInput.length > 0 && config.sendPreviewBubble
          ? [
              {
                ...createMessage({
                  role: "user",
                  content: userInput,
                }),
                preview: true,
              },
            ]
          : [],
      );
  }, [
    config.sendPreviewBubble,
    context,
    isLoading,
    session.messages,
    userInput,
  ]);

  const [msgRenderIndex, _setMsgRenderIndex] = useState(
    Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
  );
  function setMsgRenderIndex(newIndex: number) {
    newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
    newIndex = Math.max(0, newIndex);
    _setMsgRenderIndex(newIndex);
  }

  const messages = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE,
      renderMessages.length,
    );
    return renderMessages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, renderMessages]);

  const onChatBodyScroll = (e: HTMLElement) => {
    const bottomHeight = e.scrollTop + e.clientHeight;
    const edgeThreshold = e.clientHeight;

    const isTouchTopEdge = e.scrollTop <= edgeThreshold;
    const isTouchBottomEdge = bottomHeight >= e.scrollHeight - edgeThreshold;
    const isHitBottom =
      bottomHeight >= e.scrollHeight - (isMobileScreen ? 4 : 10);

    const prevPageMsgIndex = msgRenderIndex - CHAT_PAGE_SIZE;
    const nextPageMsgIndex = msgRenderIndex + CHAT_PAGE_SIZE;

    if (isTouchTopEdge && !isTouchBottomEdge) {
      setMsgRenderIndex(prevPageMsgIndex);
    } else if (isTouchBottomEdge) {
      setMsgRenderIndex(nextPageMsgIndex);
    }

    setHitBottom(isHitBottom);
    setAutoScroll(isHitBottom);
  };

  function scrollToBottom() {
    setMsgRenderIndex(renderMessages.length - CHAT_PAGE_SIZE);
    scrollDomToBottom();
  }

  const cut = (str: string, length: number = 30) => {
    if (!str) {
      return str;
    }
    return str.length >= length - 3 ? str.substring(0, length) + "..." : str;
  };

  // clear context index = context length + index in messages
  const clearContextIndex =
    (session.clearContextIndex ?? -1) >= 0
      ? session.clearContextIndex! + context.length - msgRenderIndex
      : -1;

  const [showPromptModal, setShowPromptModal] = useState(false);

  const clientConfig = useMemo(() => getClientConfig(), []);

  const autoFocus = !isMobileScreen; // wont auto focus on mobile screen
  const showMaxIcon = !isMobileScreen && !clientConfig?.isApp;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // const toggleDropdown = () => {
  //   // setIsDropdownOpen(!isDropdownOpen);
  // };

  const handleOutsideClick = (event: any) => {
    console.log("event", event.target, dropdownRef.current);
    setIsDropdownOpen(!isDropdownOpen);

    if (
      dropdownRef.current &&
      !(dropdownRef.current as HTMLElement).contains(event.target)
    ) {
      console.log("not contains");
      setIsDropdownOpen(false);
    } else {
      console.log("contains", isDropdownOpen);
      setIsDropdownOpen(!isDropdownOpen);
      setTimeout(() => {
        console.log("new isDropdownOpen", isDropdownOpen);
      }, 50);
    }
  };
  useEffect(() => {
    if (isDropdownOpen) {
      document.addEventListener("click", handleOutsideClick);
    } else {
      document.removeEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isDropdownOpen]);

  useCommand({
    fill: setUserInput,
    submit: (text) => {
      doSubmit(text);
    },
    code: (text) => {
      if (accessStore.disableFastLink) return;
      console.log("[Command] got code from url: ", text);
      showConfirm(Locale.URLCommand.Code + `code = ${text}`).then((res) => {
        if (res) {
          accessStore.update((access) => (access.accessCode = text));
        }
      });
    },
    settings: (text) => {
      if (accessStore.disableFastLink) return;

      try {
        const payload = JSON.parse(text) as {
          key?: string;
          url?: string;
        };

        console.log("[Command] got settings from url: ", payload);

        if (payload.key || payload.url) {
          showConfirm(
            Locale.URLCommand.Settings +
              `\n${JSON.stringify(payload, null, 4)}`,
          ).then((res) => {
            if (!res) return;
            if (payload.key) {
              accessStore.update(
                (access) => (access.openaiApiKey = payload.key!),
              );
            }
            if (payload.url) {
              accessStore.update((access) => (access.openaiUrl = payload.url!));
            }
          });
        }
      } catch {
        console.error("[Command] failed to get settings from url: ", text);
      }
    },
  });

  // edit / insert message modal
  const [isEditingMessage, setIsEditingMessage] = useState(false);

  // remember unfinished input
  useEffect(() => {
    // try to load from local storage
    const key = UNFINISHED_INPUT(session.id);
    const mayBeUnfinishedInput = localStorage.getItem(key);
    if (mayBeUnfinishedInput && userInput.length === 0) {
      setUserInput(mayBeUnfinishedInput);
      localStorage.removeItem(key);
    }

    const dom = inputRef.current;
    return () => {
      localStorage.setItem(key, dom?.value ?? "");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authStore.token) {
      // authStore.logout();
      //navigate(Path.Login)
      return;
    }
  }, []);

  //console.log('messages', messages)
  const message = messages.length > 0 ? messages.at(messages.length - 1) : null;
  if (message) {
    //console.log('message', message.content)
    if (message.content === Locale.Error.Unauthorized) {
      if (authStore.token) {
        console.log("change the last message");
        message.content = Locale.Error.Login;
      }
    }
    //console.log('messages', messages)
  }

  return (
    <div className={styles.chat} key={session.id}>
      <div className="window-header" data-tauri-drag-region>
        {isMobileScreen && (
          <div className="window-actions">
            <div className={"window-action-button"}>
              <IconButton
                icon={<ReturnIcon />}
                bordered
                title={Locale.Chat.Actions.ChatList}
                onClick={() => navigate(Path.Home)}
              />
            </div>
          </div>
        )}

        <div className={`window-header-title ${styles["chat-body-title"]}`}>
          <div
            className={`window-header-main-title ${styles["chat-body-main-title"]}`}
            onClickCapture={() => setIsEditingMessage(true)}
          >
            {/* {session.mask?.modelConfig?.avatarEmoji && (
              <span style={{ marginRight: "5px" }}>
                <Avatar
                  avatar={session.mask.modelConfig.avatarEmoji}
                  logoUrl={logoUrl}
                  inline={true}
                />
              </span>
            )} */}
            <span>{!session.topic ? DEFAULT_TOPIC : session.topic}</span>
          </div>
          <div className="window-header-sub-title">
            {chatPageSubTitle
              ? chatPageSubTitle.replace(
                  "${count}",
                  "" + session.messages.length,
                )
              : Locale.Chat.SubTitle(session.messages.length)}
          </div>
        </div>
        <div className={styles["window-actions"]}>
          {isMobileScreen ? (
            <div className={styles["window-action-button"]}>
              <div ref={dropdownRef}>
                <IconButton
                  icon={isDropdownOpen ? <CloseIcon /> : <MenuIcon />}
                  bordered
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                />
              </div>
              {isDropdownOpen && (
                <div className={styles["dropdown-menu"]}>
                  <IconButton
                    className={styles["window-action-button"]}
                    icon={<CartIcon />}
                    bordered
                    text="服务订阅"
                    onClick={() => navigate(Path.Pricing)}
                  />
                  <IconButton
                    className={styles["window-action-button"]}
                    icon={<UserIcon />}
                    bordered
                    text="个人中心"
                    onClick={() => navigate(Path.Profile)}
                  />
                  <IconButton
                    className={styles["window-action-button"]}
                    icon={<ExportIcon />}
                    bordered
                    text={Locale.Chat.Actions.Export}
                    title={Locale.Chat.Actions.Export}
                    onClick={() => {
                      setShowExport(true);
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="window-actions">
              {!isMobileScreen && (
                <div className="window-action-button">
                  <IconButton
                    icon={<RenameIcon />}
                    bordered
                    onClick={() => setIsEditingMessage(true)}
                  />
                </div>
              )}
              <div className="window-action-button">
                <IconButton
                  icon={<ExportIcon />}
                  bordered
                  title={Locale.Chat.Actions.Export}
                  onClick={() => {
                    setShowExport(true);
                  }}
                />
              </div>
              {showMaxIcon && (
                <div className="window-action-button">
                  <IconButton
                    icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
                    bordered
                    onClick={() => {
                      config.update(
                        (config) => (config.tightBorder = !config.tightBorder),
                      );
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <PromptToast
          showToast={!hitBottom}
          showModal={showPromptModal}
          setShowModal={setShowPromptModal}
        />
      </div>

      {(uploading || sessionLoading) && (
        <div className={styles.mask}>
          <div>
            {uploading
              ? Locale.Midjourney.Uploading
              : Locale.Chat.SessionLoading}
          </div>
        </div>
      )}

      {isSessionLoadingError && (
        <div className={styles.mask + " " + styles["chat-mask"]}>
          <div>{Locale.Chat.SessionLoadingError(sessionLoadingError)}</div>
          <div style={{ marginTop: "10px" }}>
            <IconButton
              text={Locale.Chat.ReloadSesison}
              disabled={sessionLoading}
              onClick={() => {
                reloadSession();
              }}
            ></IconButton>
          </div>
        </div>
      )}

      {session.assistant && (
        <div className={styles["top-box"]}>{session.assistant?.name}</div>
      )}

      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onScroll={(e) => onChatBodyScroll(e.currentTarget)}
        onMouseDown={() => inputRef.current?.blur()}
        onTouchStart={() => {
          inputRef.current?.blur();
          setAutoScroll(false);
        }}
      >
        {messages.map((message, i) => {
          const isUser = message.role === "user";
          const isContext = i < context.length;
          const showActions =
            i > 0 &&
            !(message.preview || (message.content ?? "").length === 0) &&
            !isContext;
          const showTyping = message.preview || message.streaming;

          const shouldShowClearContextDivider = i === clearContextIndex - 1;

          const messageModel = availableModels.filter(
            (m) => m.name === message.model,
          )[0];
          const messageEmoji = messageModel?.avatarEmoji;
          const messageHeadPhotoUuid = messageModel?.avatarFileUuid;

          return (
            <Fragment key={message.id}>
              <div
                className={
                  isUser ? styles["chat-message-user"] : styles["chat-message"]
                }
              >
                <div className={styles["chat-message-container"]}>
                  <div className={styles["chat-message-header"]}>
                    <div className={styles["chat-message-avatar"]}>
                      <div className={styles["chat-message-edit"]}>
                        <IconButton
                          icon={<EditIcon />}
                          onClick={async () => {
                            const newMessage = await showPrompt(
                              Locale.Chat.Actions.Edit,
                              message.content,
                              10,
                            );

                            message.content = newMessage;
                            chatStore.updateCurrentSessionMessageContent(
                              message,
                              authStore.token,
                              () => {
                                authStore.logout();
                                navigate(Path.Login);
                              },
                            );
                          }}
                        ></IconButton>
                      </div>
                      {isUser ? (
                        <Avatar avatar={config.avatar} logoUrl={logoUrl} />
                      ) : (
                        <>
                          {["system"].includes(message.role) ? (
                            <Avatar avatar="2699-fe0f" logoUrl={logoUrl} />
                          ) : (
                            <Avatar
                              avatar={messageEmoji}
                              logoUrl={
                                messageHeadPhotoUuid
                                  ? "/api/file/" + messageHeadPhotoUuid
                                  : logoUrl
                              }
                            />
                          )}
                        </>
                      )}
                    </div>
                    {isUser && (
                      <div className={styles["chat-message-actions"]}>
                        <div className={styles["chat-input-actions"]}>
                          {message.streaming ? (
                            <ChatAction
                              text={Locale.Chat.Actions.Stop}
                              icon={<StopIcon />}
                              onClick={() => onUserStop(message.id ?? i)}
                            />
                          ) : (
                            <>
                              {showActions && (
                                <ChatAction
                                  text={Locale.Chat.Actions.Retry}
                                  icon={<ResetIcon />}
                                  onClick={() => onResend(message)}
                                />
                              )}

                              {(!isContext ||
                                session.mask.context.length > 0) && (
                                <ChatAction
                                  text={Locale.Chat.Actions.Delete}
                                  icon={<DeleteIcon />}
                                  onClick={() =>
                                    isContext
                                      ? onDeleteContext(message)
                                      : onDelete(message)
                                  }
                                />
                              )}

                              {showActions && (
                                <ChatAction
                                  text={Locale.Chat.Actions.Pin}
                                  icon={<PinIcon />}
                                  onClick={() => onPinMessage(message)}
                                />
                              )}
                              <ChatAction
                                text={Locale.Chat.Actions.Copy}
                                icon={<CopyIcon />}
                                onClick={() => copyToClipboard(message.content)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {!isUser &&
                    message.toolMessages &&
                    message.toolMessages.map((tool, index) => (
                      <div
                        className={styles["chat-message-tools-status"]}
                        key={index}
                      >
                        <div className={styles["chat-message-tools-name"]}>
                          <CheckmarkIcon
                            className={styles["chat-message-checkmark"]}
                          />
                          {tool.toolName}:
                          <code
                            className={styles["chat-message-tools-details"]}
                          >
                            {tool.toolInput}
                          </code>
                        </div>
                      </div>
                    ))}
                  {!isUser && message.attr?.run && (
                    <div className={styles["chat-message-tools-status"]}>
                      <div className={styles["chat-message-tools-name"]}>
                        {/* <CheckmarkIcon
                          className={styles["chat-message-checkmark"]}
                        /> */}
                        助手:
                        <code className={styles["chat-message-tools-details"]}>
                          {
                            {
                              init: "正在初始化",
                              queued: "已进入队列",
                              in_progress: "思考中",
                              requires_action: "等待工具返回结果",
                              cancelling: "取消中",
                              cancelled: "已取消",
                              failed: "思考失败",
                              completed: "思考完成",
                              expired: "思考时间过长",
                            }[message.attr.run.status]
                          }
                        </code>
                      </div>
                    </div>
                  )}
                  {!isUser &&
                    message.attr?.runSteps &&
                    message.attr.runSteps.map((runStep, index) => {
                      const stepInfo = JSON.parse(runStep.thirdpartInfo);
                      const stepDetails = stepInfo?.step_details;
                      const type = stepDetails?.type;
                      return (
                        <div
                          className={styles["chat-message-tools-status"]}
                          key={index}
                        >
                          {type === "code_interpreter" && (
                            <div className={styles["chat-message-tools-name"]}>
                              <CheckmarkIcon
                                className={styles["chat-message-checkmark"]}
                              />
                              调用代码解释器：
                              <code>
                                {cut(stepDetails.code_interpreter.input)}
                              </code>
                            </div>
                          )}
                          {type === "tool_calls" &&
                            stepDetails.tool_calls.map(
                              (call: any, index: number) => {
                                return (
                                  <div
                                    className={
                                      styles["chat-message-tools-name"]
                                    }
                                    key={index}
                                  >
                                    {call.type === "code_interpreter" && (
                                      <>
                                        <CheckmarkIcon
                                          className={
                                            styles["chat-message-checkmark"]
                                          }
                                        />
                                        调用代码解释器：
                                        <code>
                                          {cut(call.code_interpreter.input)}
                                        </code>
                                      </>
                                    )}
                                  </div>
                                );
                              },
                            )}
                        </div>
                      );
                    })}

                  {showTyping && (
                    <div className={styles["chat-message-status"]}>
                      {Locale.Chat.Typing}
                    </div>
                  )}
                  <div className={styles["chat-message-item"]}>
                    {(!isUser || (message.content ?? "").length > 0) && (
                      <Markdown
                        content={message.content}
                        loading={
                          (message.preview ||
                            (message.content ?? "").length === 0) &&
                          !isUser
                        }
                        onContextMenu={(e) => onRightClick(e, message)}
                        onDoubleClickCapture={() => {
                          if (!isMobileScreen) return;
                          setUserInput(message.content);
                        }}
                        fontSize={fontSize}
                        parentRef={scrollRef}
                        defaultShow={i >= messages.length - 6}
                      />
                    )}
                    {isUser && message.attr?.imageMode && (
                      <div>
                        <div
                          className={styles["chat-select-images"]}
                          style={{ marginTop: "10px" }}
                        >
                          {message.attr.baseImages.map(
                            (img: BaseImageItem, index: number) => (
                              <img
                                src={img.url}
                                key={index}
                                title={img.filename}
                                alt={img.filename}
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  addBaseImage(img);
                                }}
                              />
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    {!isUser &&
                      [
                        "VARIATION",
                        "IMAGINE",
                        "BLEND",
                        "ZOOMOUT",
                        "PAN",
                        "SQUARE",
                        "VARY",
                      ].includes(message.attr?.action) &&
                      message.attr?.status === "SUCCESS" && (
                        <div
                          className={[
                            styles["chat-message-mj-actions"],
                            styles["column-flex"],
                          ].join(" ")}
                        >
                          <div style={{ display: "flex" }}>
                            {[1, 2, 3, 4].map((index) => {
                              return (
                                <button
                                  key={index}
                                  onClick={() =>
                                    doSubmit(
                                      `UPSCALE::${index}::${message.attr.taskId}`,
                                    )
                                  }
                                  className={`${styles["chat-message-mj-action-btn"]} clickable`}
                                >
                                  U{index}
                                </button>
                              );
                            })}
                          </div>
                          {message.attr?.action !== "PAN" && (
                            <div style={{ display: "flex" }}>
                              {[1, 2, 3, 4].map((index) => {
                                return (
                                  <button
                                    key={index}
                                    onClick={() =>
                                      doSubmit(
                                        `VARIATION::${index}::${message.attr.taskId}`,
                                      )
                                    }
                                    className={`${styles["chat-message-mj-action-btn"]} clickable`}
                                  >
                                    V{index}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    {!isUser &&
                      ["UPSCALE"].includes(message.attr?.action) &&
                      message.attr?.status === "SUCCESS" && (
                        <div
                          className={[
                            styles["chat-message-mj-actions"],
                            styles["column-flex"],
                          ].join(" ")}
                        >
                          {!message.attr?.direction && (
                            <div>
                              {["Strong", "Subtle"].map((strength) => {
                                return (
                                  <button
                                    key={strength}
                                    onClick={() =>
                                      doSubmit(
                                        `VARY::${strength.toLocaleUpperCase()}::${
                                          message.attr.taskId
                                        }`,
                                      )
                                    }
                                    className={`${styles["chat-message-mj-action-btn"]} clickable ${styles["vary"]}`}
                                  >
                                    Vary ({strength})
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <div>
                            {[1.5, 2].map((index) => {
                              return (
                                <button
                                  key={index}
                                  onClick={() =>
                                    doSubmit(
                                      `ZOOMOUT::${index}::${message.attr.taskId}`,
                                    )
                                  }
                                  className={`${styles["chat-message-mj-action-btn"]} clickable ${styles["zoom-out"]}`}
                                >
                                  Z×{index}
                                </button>
                              );
                            })}
                          </div>
                          <div style={{ display: "flex" }}>
                            {["⬅️", "➡️", "⬆️", "⬇️"]
                              .filter((_, index) => {
                                if (message.attr?.direction === "horizontal") {
                                  return index <= 1;
                                } else if (
                                  message.attr?.direction === "vertical"
                                ) {
                                  return index >= 2;
                                } else {
                                  return true;
                                }
                              })
                              .map((direction) => {
                                // ➡️
                                const str = {
                                  "⬅️": "LEFT",
                                  "➡️": "RIGHT",
                                  "⬆️": "UP",
                                  "⬇️": "DOWN",
                                }[direction];
                                return (
                                  <button
                                    key={str}
                                    onClick={() =>
                                      doSubmit(
                                        `PAN::${str}::${message.attr.taskId}`,
                                      )
                                    }
                                    className={`${styles["chat-message-mj-action-btn"]} clickable ${styles["chat-message-mj-emoji-btn"]}`}
                                  >
                                    {direction === "⬅️" && <PanLeftIcon />}
                                    {direction === "➡️" && <PanRightIcon />}
                                    {direction === "⬆️" && <PanUpIcon />}
                                    {direction === "⬇️" && <PanDownIcon />}
                                  </button>
                                );
                              })}
                            {message.attr?.direction && (
                              <button
                                onClick={() =>
                                  doSubmit(`SQUARE::1::${message.attr.taskId}`)
                                }
                                className={`${styles["chat-message-mj-action-btn"]} clickable ${styles["chat-message-mj-emoji-btn"]}`}
                              >
                                {message.attr?.direction === "vertical" && (
                                  <HorizontalIcon />
                                )}
                                {message.attr?.direction === "horizontal" && (
                                  <VerticalIcon />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    {!isUser &&
                      message.attr?.status !== "SUCCESS" &&
                      message.attr?.status !== "FAILURE" &&
                      message.attr?.taskId && (
                        <RefreshDrawStatus
                          message={message}
                          session={session}
                          refreshDrawStatus={refreshDrawStatus}
                          ChatFetchTaskPool={ChatFetchTaskPool}
                        />
                      )}

                    {!isUser && (
                      <div
                        className={
                          styles["chat-message-actions"] +
                          " " +
                          styles["assistant"]
                        }
                      >
                        <div className={styles["chat-input-actions"]}>
                          {message.streaming ? (
                            <ChatAction
                              text={Locale.Chat.Actions.Stop}
                              icon={<StopIcon />}
                              onClick={() => onUserStop(message.id ?? i)}
                            />
                          ) : (
                            <>
                              {showActions && (
                                <ChatAction
                                  text={Locale.Chat.Actions.Retry}
                                  icon={<ResetIcon />}
                                  onClick={() => onResend(message)}
                                />
                              )}

                              {(!isContext ||
                                session.mask.context.length > 0) && (
                                <ChatAction
                                  text={Locale.Chat.Actions.Delete}
                                  icon={<DeleteIcon />}
                                  onClick={() =>
                                    isContext
                                      ? onDeleteContext(message)
                                      : onDelete(message)
                                  }
                                />
                              )}

                              {showActions && (
                                <ChatAction
                                  text={Locale.Chat.Actions.Pin}
                                  icon={<PinIcon />}
                                  onClick={() => onPinMessage(message)}
                                />
                              )}
                              <ChatAction
                                text={Locale.Chat.Actions.Copy}
                                icon={<CopyIcon />}
                                onClick={() => copyToClipboard(message.content)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles["chat-message-action-date"]}>
                    {isContext
                      ? Locale.Chat.IsContext
                      : message.date.toLocaleString()}
                  </div>
                </div>
              </div>
              {shouldShowClearContextDivider && <ClearContextDivider />}
            </Fragment>
          );
        })}
      </div>

      <div className={styles["chat-input-panel"]}>
        <PromptHints prompts={promptHints} onPromptSelect={onPromptSelect} />

        <ChatActions
          showPromptModal={() => setShowPromptModal(true)}
          scrollToBottom={scrollToBottom}
          hitBottom={hitBottom}
          uploading={uploading}
          setUploading={setUploading}
          showPromptHints={() => {
            // Click again to close
            if (promptHints.length > 0) {
              setPromptHints([]);
              return;
            }

            inputRef.current?.focus();
            setUserInput("/");
            onSearch("");
          }}
          plugins={
            session.mask?.modelConfig?.contentType !== "Image" &&
            session.mask?.modelConfig?.messageStruct !== "complex"
              ? pluignModels
              : []
          }
          togglePlugin={async (plugin: PluginActionModel) => {
            const value = !plugin.value;
            const result = await chatStore.updateCurrentSessionMaskByUpdater(
              (mask) => {
                let pluginUuids = mask.modelConfig.pluginUuids || [];
                if (value) {
                  pluginUuids = [
                    ...new Set([...pluginUuids, plugin.plugin.uuid]),
                  ];
                } else {
                  const index = pluginUuids.findIndex(
                    (u) => u === plugin.plugin.uuid,
                  );
                  if (index >= 0) {
                    pluginUuids.splice(index, 1);
                  }
                }
                mask.modelConfig.pluginUuids = pluginUuids;
                mask.syncGlobalConfig = false;
                return true;
              },
              authStore.token,
              () => {
                authStore.logout();
                navigate(Path.Login);
              },
            );
            if (result) {
              plugin.value = value;
            }
            return { result, value: plugin.value };
          }}
          processModes={session.mask?.modelConfig?.processModes ?? []}
          selectedProcessMode={session.mask?.modelConfig?.processMode}
          toggleProcessMode={async (processMode: SPEED_MAP_KEY) => {
            const result = await chatStore.updateCurrentSessionMaskByUpdater(
              (mask) => {
                mask.modelConfig.processMode = processMode;
                mask.syncGlobalConfig = false;
                return true;
              },
              authStore.token,
              () => {
                authStore.logout();
                navigate(Path.Login);
              },
            );
            if (result) {
              session.mask.modelConfig.processMode = processMode;
            }
            return { result, value: processMode };
          }}
          contentType={session.mask?.modelConfig?.contentType}
          messageStruct={session.mask?.modelConfig?.messageStruct}
          imageSelected={(img: BaseImageItem) => {
            addBaseImage(img);
          }}
          beforeSelectImages={() => {
            const ok = useImages.length < MAX_IMAGE_SIZE;
            if (!ok) {
              showToast(Locale.Midjourney.SelectImgMax(MAX_IMAGE_SIZE));
            }
            return ok;
          }}
          assistant={session.assistant}
        />
        {useImages.length > 0 && (
          <div className={styles["chat-select-images"]}>
            {useImages.map((img: any, i) => (
              <img
                src={img.url}
                key={i}
                onClick={() => {
                  const newImages = useImages.filter((_, ii) => ii != i);
                  setUseImages(newImages);
                  if (newImages.length === 0) {
                    setMjImageMode("");
                  }
                }}
                title={img.filename}
                alt={img.filename}
              />
            ))}
            {session.mask?.modelConfig?.contentType === "Image" && (
              <>
                <div style={{ fontSize: "12px", marginBottom: "5px" }}>
                  {[
                    {
                      name: Locale.Midjourney.ModeImagineUseImg,
                      value: "IMAGINE",
                    },
                    { name: Locale.Midjourney.ModeBlend, value: "BLEND" },
                    { name: Locale.Midjourney.ModeDescribe, value: "DESCRIBE" },
                  ].map((item, i) => (
                    <label key={i}>
                      <input
                        type="radio"
                        name="mj-img-mode"
                        checked={mjImageMode == item.value}
                        value={item.value}
                        onChange={(e) => {
                          setMjImageMode(e.target.value as ImageMode);
                        }}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: "12px" }}>
                  <small>{Locale.Midjourney.HasImgTip}</small>
                </div>
              </>
            )}
          </div>
        )}
        <div className={styles["chat-input-panel-inner"]}>
          <textarea
            ref={inputRef}
            className={styles["chat-input"]}
            placeholder={
              useImages.length > 0 &&
              ["BLEND", "DESCRIBE"].includes(mjImageMode)
                ? Locale.Midjourney.InputDisabled
                : Locale.Chat.Input(
                    submitKey,
                    session.mask?.modelConfig?.contentType === "Image"
                      ? Locale.Chat.Draw
                      : Locale.Chat.Send,
                    session.mask?.modelConfig?.contentType !== "Image",
                  )
            }
            onInput={(e) => onInput(e.currentTarget.value)}
            value={userInput}
            onKeyDown={onInputKeyDown}
            onFocus={scrollToBottom}
            onClick={scrollToBottom}
            rows={inputRows}
            autoFocus={autoFocus}
            style={{
              fontSize: config.fontSize,
            }}
            disabled={
              useImages.length > 0 &&
              ["BLEND", "DESCRIBE"].includes(mjImageMode)
            }
          />
          <IconButton
            icon={<SendWhiteIcon />}
            text={
              session.mask?.modelConfig?.contentType === "Image"
                ? Locale.Chat.Draw
                : Locale.Chat.Send
            }
            className={styles["chat-input-send"]}
            type="primary"
            onClick={() => doSubmit(userInput)}
          />
        </div>
      </div>

      {showExport && (
        <ExportMessageModal onClose={() => setShowExport(false)} />
      )}

      {isEditingMessage && (
        <EditMessageModal
          onClose={() => {
            setIsEditingMessage(false);
          }}
          updateTopic={(topic) => {
            return chatStore.updateCurrentSessionTopic(
              topic,
              authStore.token,
              () => {
                authStore.logout();
                navigate(Path.Login);
              },
            );
          }}
          updateMessages={(messages) => {
            return chatStore.updateCurrentSessionMessages(
              messages,
              authStore.token,
              () => {
                authStore.logout();
                navigate(Path.Login);
              },
            );
          }}
        />
      )}
    </div>
  );
}

export function Chat(props: {
  setRequestingSession: Dispatch<SetStateAction<ChatSession | null>>;
}) {
  const chatStore = useChatStore();
  const sessionIndex = chatStore.currentSessionIndex;
  return (
    <_Chat
      key={sessionIndex}
      setRequestingSession={props.setRequestingSession}
    ></_Chat>
  );
}
